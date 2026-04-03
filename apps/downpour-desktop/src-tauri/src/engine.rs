use std::{
    collections::{BTreeSet, HashMap, HashSet},
    sync::{
        atomic::{AtomicU64, Ordering},
        LazyLock, Mutex,
    },
    time::{SystemTime, UNIX_EPOCH},
};

use serde::{Deserialize, Serialize};

use crate::errors::AppError;

// Y where the ground sits in normalized screen space (0 = top, 1 = bottom).
// Words falling past this line count as missed.
const GROUND_BASE_Y: f64 = 0.84;

// Highest the waterline can visually reach. At water_level = 1.0 the surface
// sits here, leaving almost no room for words — game over.
const WATERLINE_TOP_Y: f64 = 0.14;

// Vertical range the waterline can cover (ground to top). Converts the
// abstract 0..1 water_level into a screen-space offset.
const WATERLINE_RISE_RANGE: f64 = GROUND_BASE_Y - WATERLINE_TOP_Y;

// How much the target waterline drops when a word is cleared. Intentionally
// small — players need sustained accuracy to push water back down.
const WATERLINE_CLEAR_DROP: f64 = 0.01;

// Base waterline rise when a word is missed.
const WATERLINE_MISS_RISE_BASE: f64 = 0.03;

// Extra rise per letter in the missed word. Longer misses hurt more,
// nudging players toward clearing long words before they land.
const WATERLINE_MISS_RISE_PER_LETTER: f64 = 0.0018;

// Extra rise per current level. Misses get progressively more dangerous
// as the game speeds up, creating late-game pressure.
const WATERLINE_MISS_RISE_PER_LEVEL: f64 = 0.001;

// Exponential blend rate when the waterline is rising. Higher = snappier.
// Intentionally faster than FALL_RESPONSE so rises feel urgent.
const WATERLINE_RISE_RESPONSE: f64 = 8.5;

// Exponential blend rate when the waterline is falling. Slower than
// the rise rate so recovery feels gradual and earned.
const WATERLINE_FALL_RESPONSE: f64 = 5.5;

// Seconds between automatic level-ups (unless the player clears enough
// words first). 15s keeps levels short without being overwhelming.
const LEVEL_UP_SECONDS: f64 = 15.0;

// Words cleared to trigger an early level-up. Rewards fast typers by
// advancing them before the timer, which also means harder words sooner.
const LEVEL_UP_WORDS: u32 = 7;

// Minimum spawn interval — words never appear faster than this.
// Prevents screen flooding at very high levels.
const SPAWN_INTERVAL_MIN: f64 = 0.28;

// Minimum fall speed — even on very-easy mode, words still move.
const FALL_SPEED_MIN: f64 = 0.10;

// Rolling window (in active-typing seconds) for the current WPM readout.
// Longer than the frontend's 0.9s display window because the Rust engine
// also uses this for session peak WPM tracking.
const CURRENT_WPM_WINDOW_SECONDS: f64 = 8.0;

// Minimum time span used when computing WPM. Prevents absurd spikes when
// a player types a burst of characters in under a second.
const PEAK_WPM_MIN_SECONDS: f64 = 1.5;

// How many recently-spawned words to remember for dedup. Prevents the
// same word from appearing twice in quick succession.
const RECENT_WORD_MEMORY: usize = 18;

// Per-difficulty caps on how many words can be on screen simultaneously.
const MAX_CONCURRENT_VERY_EASY: u32 = 12;
const MAX_CONCURRENT_EASY: u32 = 13;
const MAX_CONCURRENT_MEDIUM: u32 = 14;
const MAX_CONCURRENT_HARD: u32 = 16;
const MAX_CONCURRENT_VERY_HARD: u32 = 18;

const STARTER_WORDS_RAW: &str = include_str!("../../src/assets/wordlists/starter.txt");
const COMMON_WORDS_RAW: &str = include_str!("../../src/assets/wordlists/scowl-common.txt");
const EXTENDED_WORDS_RAW: &str = include_str!("../../src/assets/wordlists/scowl-extended.txt");

static STARTER_WORDS: LazyLock<Vec<String>> =
    LazyLock::new(|| parse_word_list(STARTER_WORDS_RAW, 3));
static COMMON_WORDS: LazyLock<Vec<String>> = LazyLock::new(|| parse_word_list(COMMON_WORDS_RAW, 4));
static EXTENDED_WORDS: LazyLock<Vec<String>> =
    LazyLock::new(|| parse_word_list(EXTENDED_WORDS_RAW, 4));
static EXTENDED_ONLY_WORDS: LazyLock<Vec<String>> = LazyLock::new(build_extended_only_words);
static WORD_LIST: LazyLock<Vec<String>> = LazyLock::new(build_word_list);
static EASY_WORDS: LazyLock<Vec<String>> = LazyLock::new(build_easy_words);
static STEADY_WORDS: LazyLock<Vec<String>> = LazyLock::new(build_steady_words);
static TRICKY_WORDS: LazyLock<Vec<String>> = LazyLock::new(build_tricky_words);
static STORM_WORDS: LazyLock<Vec<String>> = LazyLock::new(build_storm_words);

#[allow(dead_code)]
#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GameSettings {
    pub reduced_motion: bool,
    pub graphics_quality: String,
    pub difficulty: String,
    pub sound_enabled: bool,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum GameAction {
    Printable { value: String },
    Backspace,
    SetPaused { paused: bool },
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RenderWord {
    pub id: String,
    pub text: String,
    pub x: f64,
    pub y: f64,
    pub typed_count: u32,
    pub speed: f64,
    pub mistake_flash: f64,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImpactEvent {
    pub x: f64,
    pub y: f64,
    pub strength: f64,
    pub r#type: String,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionRenderSnapshot {
    pub elapsed_seconds: f64,
    pub water_level: f64,
    pub wind: f64,
    pub ground_line: f64,
    pub words: Vec<RenderWord>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionEndSummary {
    pub duration_seconds: f64,
    pub score: i64,
    pub accuracy: f64,
    pub session_best_wpm: f64,
    pub average_wpm: f64,
    pub level_reached: u32,
    pub mistakes: u32,
    pub misses: u32,
    pub mode: String,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HudSnapshot {
    pub elapsed_seconds: f64,
    pub level: u32,
    pub score: i64,
    pub combo: u32,
    pub lives: u32,
    pub water_level: f64,
    pub accuracy: f64,
    pub current_wpm: f64,
    pub session_best_wpm: f64,
    pub global_best_wpm: f64,
    pub is_paused: bool,
    pub is_game_over: bool,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GameSessionFrame {
    pub session_id: String,
    pub hud: HudSnapshot,
    pub render_snapshot: SessionRenderSnapshot,
    pub impacts: Vec<ImpactEvent>,
    pub end_summary: Option<SessionEndSummary>,
}

#[derive(Clone, Debug)]
struct ActiveWord {
    id: String,
    text: String,
    x: f64,
    y: f64,
    speed: f64,
    mistake_flash: f64,
}

#[derive(Clone, Debug)]
struct DifficultyProfile {
    spawn_interval_seconds: f64,
    fall_speed_normalized: f64,
    max_concurrent_words: usize,
}

#[derive(Clone, Debug)]
struct GameSession {
    settings: GameSettings,
    random: SimpleRng,
    words: Vec<ActiveWord>,
    pending_impacts: Vec<ImpactEvent>,
    elapsed_seconds: f64,
    level: u32,
    score: i64,
    combo: u32,
    lives: u32,
    water_level: f64,
    target_water_level: f64,
    cleared_since_level: u32,
    misses: u32,
    mistakes: u32,
    total_typed_chars: u32,
    correct_chars: u32,
    typed_buffer: String,
    target_word_id: Option<String>,
    recent_words: Vec<String>,
    next_level_at_seconds: f64,
    spawn_accumulator: f64,
    spawn_tick_counter: u64,
    session_best_wpm: f64,
    wpm_active_seconds: f64,
    typing_segment_active: bool,
    recent_correct_events: Vec<f64>,
    global_best_wpm: f64,
    paused: bool,
    game_over: bool,
    wind: f64,
}

#[derive(Debug)]
pub struct EngineManager {
    next_session_id: AtomicU64,
    sessions: Mutex<HashMap<String, GameSession>>,
}

impl Default for EngineManager {
    fn default() -> Self {
        Self {
            next_session_id: AtomicU64::new(1),
            sessions: Mutex::new(HashMap::new()),
        }
    }
}

impl EngineManager {
    pub fn create_session(
        &self,
        settings: GameSettings,
        global_best_wpm: f64,
    ) -> Result<GameSessionFrame, AppError> {
        let id = format!(
            "session-{}",
            self.next_session_id.fetch_add(1, Ordering::Relaxed)
        );
        let session = GameSession::new(settings, global_best_wpm);
        let frame = session.frame(&id);
        self.sessions
            .lock()
            .map_err(|_| AppError::State("engine session mutex poisoned".to_string()))?
            .insert(id, session);
        Ok(frame)
    }

    pub fn tick_session(
        &self,
        session_id: &str,
        delta_seconds: f64,
        actions: Vec<GameAction>,
    ) -> Result<GameSessionFrame, AppError> {
        let mut sessions = self
            .sessions
            .lock()
            .map_err(|_| AppError::State("engine session mutex poisoned".to_string()))?;
        let session = sessions
            .get_mut(session_id)
            .ok_or_else(|| AppError::NotFound(format!("session '{}' not found", session_id)))?;

        session.apply_actions(actions);
        session.update(delta_seconds);
        Ok(session.take_frame(session_id))
    }

    pub fn destroy_session(&self, session_id: &str) -> Result<(), AppError> {
        let removed = self
            .sessions
            .lock()
            .map_err(|_| AppError::State("engine session mutex poisoned".to_string()))?
            .remove(session_id);

        if removed.is_some() {
            Ok(())
        } else {
            Err(AppError::NotFound(format!(
                "session '{}' not found",
                session_id
            )))
        }
    }
}

impl GameSession {
    fn new(settings: GameSettings, global_best_wpm: f64) -> Self {
        let seed = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|duration| duration.as_nanos() as u64)
            .unwrap_or(1);

        Self {
            settings,
            random: SimpleRng::new(seed),
            words: Vec::new(),
            pending_impacts: Vec::new(),
            elapsed_seconds: 0.0,
            level: 1,
            score: 0,
            combo: 0,
            lives: 0,
            water_level: 0.0,
            target_water_level: 0.0,
            cleared_since_level: 0,
            misses: 0,
            mistakes: 0,
            total_typed_chars: 0,
            correct_chars: 0,
            typed_buffer: String::new(),
            target_word_id: None,
            recent_words: Vec::new(),
            next_level_at_seconds: LEVEL_UP_SECONDS,
            spawn_accumulator: 0.0,
            spawn_tick_counter: 0,
            session_best_wpm: 0.0,
            wpm_active_seconds: 0.0,
            typing_segment_active: false,
            recent_correct_events: Vec::new(),
            global_best_wpm: global_best_wpm.max(0.0),
            paused: false,
            game_over: false,
            wind: 0.0,
        }
    }

    fn apply_actions(&mut self, actions: Vec<GameAction>) {
        for action in actions {
            match action {
                GameAction::Printable { value } => {
                    if let Some(character) = value.chars().next() {
                        self.handle_printable_input(character);
                    }
                }
                GameAction::Backspace => self.handle_backspace(),
                GameAction::SetPaused { paused } => self.set_paused(paused),
            }
        }
    }

    fn update(&mut self, delta_seconds: f64) {
        if self.paused || self.game_over {
            return;
        }

        let dt = clamp(delta_seconds, 0.0, 0.05);
        self.elapsed_seconds += dt;

        if !self.settings.reduced_motion {
            self.wind = (self.elapsed_seconds * 0.35).sin() * 0.2
                + (self.elapsed_seconds * 1.2).sin() * 0.08;
        } else {
            self.wind = 0.0;
        }

        self.progress_difficulty();
        self.spawn_words(dt);
        self.update_words(dt);
        self.update_waterline(dt);

        if self.typing_segment_active {
            self.wpm_active_seconds += dt;
            self.trim_recent_correct_events();
        }

        let current_wpm = rolling_wpm(self.wpm_active_seconds, &self.recent_correct_events);
        self.session_best_wpm = self.session_best_wpm.max(current_wpm);
    }

    fn frame(&self, session_id: &str) -> GameSessionFrame {
        GameSessionFrame {
            session_id: session_id.to_string(),
            hud: self.hud_snapshot(),
            render_snapshot: self.render_snapshot(),
            impacts: Vec::new(),
            end_summary: self.end_summary(),
        }
    }

    fn take_frame(&mut self, session_id: &str) -> GameSessionFrame {
        GameSessionFrame {
            session_id: session_id.to_string(),
            hud: self.hud_snapshot(),
            render_snapshot: self.render_snapshot(),
            impacts: std::mem::take(&mut self.pending_impacts),
            end_summary: self.end_summary(),
        }
    }

    fn hud_snapshot(&self) -> HudSnapshot {
        HudSnapshot {
            elapsed_seconds: self.elapsed_seconds,
            level: self.level,
            score: self.score,
            combo: self.combo,
            lives: self.lives,
            water_level: self.water_level,
            accuracy: compute_accuracy(self.correct_chars, self.total_typed_chars),
            current_wpm: rolling_wpm(self.wpm_active_seconds, &self.recent_correct_events),
            session_best_wpm: self.session_best_wpm,
            global_best_wpm: self.global_best_wpm,
            is_paused: self.paused,
            is_game_over: self.game_over,
        }
    }

    fn render_snapshot(&self) -> SessionRenderSnapshot {
        let matching_word_ids: HashSet<&str> = if self.typed_buffer.is_empty() {
            HashSet::new()
        } else {
            self.matching_word_indices(&self.typed_buffer)
                .into_iter()
                .map(|index| self.words[index].id.as_str())
                .collect()
        };

        SessionRenderSnapshot {
            elapsed_seconds: self.elapsed_seconds,
            water_level: self.water_level,
            wind: self.wind,
            ground_line: self.ground_line(),
            words: self
                .words
                .iter()
                .map(|word| RenderWord {
                    id: word.id.clone(),
                    text: word.text.clone(),
                    x: word.x,
                    y: word.y,
                    typed_count: self.render_typed_count(word, &matching_word_ids),
                    speed: word.speed,
                    mistake_flash: word.mistake_flash,
                })
                .collect(),
        }
    }

    fn end_summary(&self) -> Option<SessionEndSummary> {
        if !self.game_over {
            return None;
        }

        Some(SessionEndSummary {
            duration_seconds: self.elapsed_seconds,
            score: self.score,
            accuracy: compute_accuracy(self.correct_chars, self.total_typed_chars),
            session_best_wpm: self.session_best_wpm,
            average_wpm: compute_wpm(self.correct_chars, self.wpm_active_seconds),
            level_reached: self.level,
            mistakes: self.mistakes,
            misses: self.misses,
            mode: self.settings.difficulty.clone(),
        })
    }

    fn set_paused(&mut self, paused: bool) {
        if self.game_over {
            self.paused = false;
            return;
        }

        self.paused = paused;
    }

    fn handle_printable_input(&mut self, character: char) {
        if self.paused || self.game_over {
            return;
        }

        let key = character.to_ascii_lowercase();
        if !key.is_ascii_alphabetic() {
            return;
        }

        self.total_typed_chars += 1;
        let proposal = format!("{}{}", self.typed_buffer, key);
        let matches = self.matching_word_indices(&proposal);

        if matches.is_empty() {
            self.register_mistake(self.target_word_id.clone());
            return;
        }

        self.correct_chars += 1;
        self.typed_buffer = proposal;
        self.typing_segment_active = true;
        self.record_correct_char();

        if matches.len() == 1 {
            let word_id = self.words[matches[0]].id.clone();
            self.target_word_id = Some(word_id.clone());

            if self.words[matches[0]].text.len() == self.typed_buffer.len() {
                self.handle_word_clear(&word_id);
            }
        } else {
            self.target_word_id = None;
        }
    }

    fn handle_backspace(&mut self) {
        if self.paused || self.game_over {
            return;
        }

        if self.typed_buffer.is_empty() {
            return;
        }

        self.typed_buffer.pop();
        self.reconcile_buffer_after_word_change();

        if self.typed_buffer.is_empty() {
            self.typing_segment_active = false;
        }
    }

    fn register_mistake(&mut self, word_id: Option<String>) {
        self.mistakes += 1;
        self.combo = 0;

        if let Some(id) = word_id {
            if let Some(word) = self.words.iter_mut().find(|word| word.id == id) {
                word.mistake_flash = 1.0;
            }
        }
    }

    fn handle_word_clear(&mut self, word_id: &str) {
        let Some(index) = self.words.iter().position(|word| word.id == word_id) else {
            return;
        };
        let word = self.words[index].clone();
        let points = calculate_word_score(word.text.len(), self.level, self.combo);

        self.score += points;
        self.combo += 1;
        self.cleared_since_level += 1;
        self.target_water_level = (self.target_water_level - WATERLINE_CLEAR_DROP).max(0.0);
        self.pending_impacts.push(ImpactEvent {
            x: word.x,
            y: word.y,
            strength: 0.55,
            r#type: "clear".to_string(),
        });

        self.words.remove(index);
        self.target_word_id = None;
        self.typed_buffer.clear();
        self.typing_segment_active = false;
    }

    fn progress_difficulty(&mut self) {
        if self.elapsed_seconds >= self.next_level_at_seconds
            || self.cleared_since_level >= LEVEL_UP_WORDS
        {
            self.level += 1;
            self.next_level_at_seconds += LEVEL_UP_SECONDS;
            self.cleared_since_level = 0;
        }
    }

    fn spawn_words(&mut self, delta_seconds: f64) {
        let profile = get_difficulty_profile(self.level, &self.settings.difficulty);
        self.spawn_accumulator += delta_seconds;

        while self.spawn_accumulator >= profile.spawn_interval_seconds
            && self.words.len() < profile.max_concurrent_words
        {
            self.spawn_accumulator -= profile.spawn_interval_seconds;
            self.spawn_tick_counter += 1;

            let blocked: HashSet<String> = self
                .words
                .iter()
                .map(|word| word.text.clone())
                .chain(self.recent_words.iter().cloned())
                .collect();
            let text = pick_word(self.level, &blocked, &mut self.random);
            self.remember_word(&text);

            let x = 0.1 + self.random.next_f64() * 0.8;
            let y = -0.05 - self.random.next_f64() * 0.2;
            let speed = profile.fall_speed_normalized * (0.85 + self.random.next_f64() * 0.4);

            self.words.push(ActiveWord {
                id: format!("word-{}", self.spawn_tick_counter),
                text,
                x,
                y,
                speed,
                mistake_flash: 0.0,
            });
        }
    }

    fn update_words(&mut self, delta_seconds: f64) {
        let ground_line = self.ground_line();
        let mut missed_ids = Vec::new();

        for word in &mut self.words {
            word.y += word.speed * delta_seconds;
            if word.mistake_flash > 0.0 {
                word.mistake_flash = (word.mistake_flash - delta_seconds * 3.0).max(0.0);
            }

            if word.y >= ground_line {
                missed_ids.push(word.id.clone());
            }
        }

        for id in missed_ids {
            self.handle_miss(&id);
        }
    }

    fn handle_miss(&mut self, word_id: &str) {
        let Some(index) = self.words.iter().position(|word| word.id == word_id) else {
            return;
        };
        let word = self.words.remove(index);

        if !self.typed_buffer.is_empty() {
            self.reconcile_buffer_after_word_change();
        }

        self.misses += 1;
        self.combo = 0;

        let impact_y = self.ground_line();
        let increment = WATERLINE_MISS_RISE_BASE
            + word.text.len() as f64 * WATERLINE_MISS_RISE_PER_LETTER
            + self.level as f64 * WATERLINE_MISS_RISE_PER_LEVEL;
        self.target_water_level = (self.target_water_level + increment).min(1.0);

        self.pending_impacts.push(ImpactEvent {
            x: word.x,
            y: impact_y,
            strength: 1.35 + word.text.len() as f64 * 0.04,
            r#type: "miss".to_string(),
        });
    }

    fn end_game(&mut self) {
        self.paused = false;
        self.game_over = true;
    }

    fn update_waterline(&mut self, delta_seconds: f64) {
        let target = clamp(self.target_water_level, 0.0, 1.0);
        let response = if target > self.water_level {
            WATERLINE_RISE_RESPONSE
        } else {
            WATERLINE_FALL_RESPONSE
        };
        let blend = 1.0 - (-response * delta_seconds).exp();

        if (target - self.water_level).abs() <= 0.0005 {
            self.water_level = target;
        } else {
            self.water_level += (target - self.water_level) * blend;
        }

        if self.water_level >= 0.999 {
            self.water_level = 1.0;
            self.target_water_level = 1.0;
            self.end_game();
        }
    }

    fn ground_line(&self) -> f64 {
        GROUND_BASE_Y - self.water_level * WATERLINE_RISE_RANGE
    }

    fn remember_word(&mut self, word: &str) {
        self.recent_words.push(word.to_string());
        if self.recent_words.len() > RECENT_WORD_MEMORY {
            let overflow = self.recent_words.len() - RECENT_WORD_MEMORY;
            self.recent_words.drain(0..overflow);
        }
    }

    fn matching_word_indices(&self, proposal: &str) -> Vec<usize> {
        if proposal.is_empty() {
            return Vec::new();
        }

        self.words
            .iter()
            .enumerate()
            .filter_map(|(index, word)| word.text.starts_with(proposal).then_some(index))
            .collect()
    }

    fn render_typed_count(&self, word: &ActiveWord, matching_word_ids: &HashSet<&str>) -> u32 {
        if self.typed_buffer.is_empty() {
            return 0;
        }

        if self.target_word_id.as_deref() == Some(word.id.as_str())
            || (self.target_word_id.is_none() && matching_word_ids.contains(word.id.as_str()))
        {
            self.typed_buffer.len() as u32
        } else {
            0
        }
    }

    fn reconcile_buffer_after_word_change(&mut self) {
        if self.typed_buffer.is_empty() {
            self.target_word_id = None;
            return;
        }

        let matches = self.matching_word_indices(&self.typed_buffer);
        if matches.is_empty() {
            self.typed_buffer.clear();
            self.target_word_id = None;
            self.typing_segment_active = false;
        } else if matches.len() == 1 {
            self.target_word_id = Some(self.words[matches[0]].id.clone());
        } else {
            self.target_word_id = None;
        }
    }

    fn record_correct_char(&mut self) {
        self.recent_correct_events.push(self.wpm_active_seconds);
        self.trim_recent_correct_events();
        let current_wpm = rolling_wpm(self.wpm_active_seconds, &self.recent_correct_events);
        self.session_best_wpm = self.session_best_wpm.max(current_wpm);
    }

    fn trim_recent_correct_events(&mut self) {
        let cutoff = (self.wpm_active_seconds - CURRENT_WPM_WINDOW_SECONDS).max(0.0);
        while let Some(first) = self.recent_correct_events.first() {
            if *first < cutoff {
                self.recent_correct_events.remove(0);
            } else {
                break;
            }
        }
    }
}

#[derive(Clone, Debug)]
struct SimpleRng {
    state: u64,
}

impl SimpleRng {
    fn new(seed: u64) -> Self {
        Self { state: seed | 1 }
    }

    fn next_u64(&mut self) -> u64 {
        self.state = self.state.wrapping_add(0x9e3779b97f4a7c15);
        let mut z = self.state;
        z = (z ^ (z >> 30)).wrapping_mul(0xbf58476d1ce4e5b9);
        z = (z ^ (z >> 27)).wrapping_mul(0x94d049bb133111eb);
        z ^ (z >> 31)
    }

    fn next_f64(&mut self) -> f64 {
        (self.next_u64() >> 11) as f64 / ((1u64 << 53) as f64)
    }
}

fn clamp(value: f64, min: f64, max: f64) -> f64 {
    value.max(min).min(max)
}

fn compute_accuracy(correct_chars: u32, total_typed_chars: u32) -> f64 {
    if total_typed_chars == 0 {
        0.0
    } else {
        correct_chars as f64 / total_typed_chars as f64
    }
}

fn compute_wpm(correct_chars: u32, elapsed_seconds: f64) -> f64 {
    let minutes = elapsed_seconds / 60.0;
    if minutes <= 0.0 {
        0.0
    } else {
        (correct_chars as f64 / 5.0) / minutes
    }
}

fn calculate_word_score(word_length: usize, level: u32, combo_streak: u32) -> i64 {
    let base = 12.0 + word_length as f64 * 7.0;
    let level_factor = 1.0 + level.saturating_sub(1) as f64 * 0.11;
    let combo = 1.0 + combo_streak.min(20) as f64 * 0.05;
    (base * level_factor * combo).round() as i64
}

fn get_difficulty_profile(level: u32, difficulty: &str) -> DifficultyProfile {
    let safe_level = level.max(1) as f64;
    let (speed_multiplier, spawn_multiplier, max_concurrent_words) = match difficulty {
        "veryEasy" => (0.76, 0.78, MAX_CONCURRENT_VERY_EASY),
        "easy" => (0.92, 0.89, MAX_CONCURRENT_EASY),
        "hard" => (1.2, 1.15, MAX_CONCURRENT_HARD),
        "veryHard" => (1.32, 1.3, MAX_CONCURRENT_VERY_HARD),
        "medium" | "normal" | _ => (1.0, 1.0, MAX_CONCURRENT_MEDIUM),
    };

    DifficultyProfile {
        spawn_interval_seconds: clamp(
            (1.55 - safe_level * 0.07) / spawn_multiplier,
            SPAWN_INTERVAL_MIN,
            1.55,
        ),
        fall_speed_normalized: clamp(
            (0.098 + safe_level * 0.015) * speed_multiplier,
            FALL_SPEED_MIN,
            0.58,
        ),
        max_concurrent_words: (3.0 + safe_level * 0.7).floor() as usize,
    }
    .with_cap(max_concurrent_words as usize)
}

impl DifficultyProfile {
    fn with_cap(mut self, cap: usize) -> Self {
        self.max_concurrent_words = self.max_concurrent_words.clamp(3, cap);
        self
    }
}

fn bucket_weights(level: u32) -> (f64, f64, f64, f64) {
    if level <= 2 {
        (0.96, 0.04, 0.0, 0.0)
    } else if level <= 4 {
        (0.74, 0.22, 0.04, 0.0)
    } else if level <= 7 {
        (0.34, 0.42, 0.2, 0.04)
    } else if level <= 10 {
        (0.12, 0.28, 0.36, 0.24)
    } else {
        (0.05, 0.15, 0.36, 0.44)
    }
}

fn pick_bucket(level: u32, random: &mut SimpleRng) -> &'static [String] {
    let (easy_weight, steady_weight, tricky_weight, _) = bucket_weights(level);
    let roll = random.next_f64();
    if roll < easy_weight {
        EASY_WORDS.as_slice()
    } else if roll < easy_weight + steady_weight {
        STEADY_WORDS.as_slice()
    } else if roll < easy_weight + steady_weight + tricky_weight {
        TRICKY_WORDS.as_slice()
    } else {
        STORM_WORDS.as_slice()
    }
}

fn pick_word(level: u32, blocked_words: &HashSet<String>, random: &mut SimpleRng) -> String {
    let pool = pick_bucket(level, random);

    if pool.is_empty() {
        return WORD_LIST[(random.next_f64() * WORD_LIST.len() as f64).floor() as usize].clone();
    }

    for _ in 0..20 {
        let candidate = pool[(random.next_f64() * pool.len() as f64).floor() as usize].clone();
        if !blocked_words.contains(&candidate) {
            return candidate;
        }
    }

    for _ in 0..40 {
        let candidate =
            WORD_LIST[(random.next_f64() * WORD_LIST.len() as f64).floor() as usize].clone();
        if !blocked_words.contains(&candidate) {
            return candidate;
        }
    }

    pool[(random.next_f64() * pool.len() as f64).floor() as usize].clone()
}

fn build_word_list() -> Vec<String> {
    merge_unique_word_lists(&[
        STARTER_WORDS.as_slice(),
        COMMON_WORDS.as_slice(),
        EXTENDED_WORDS.as_slice(),
    ])
}

fn build_extended_only_words() -> Vec<String> {
    let common_words: HashSet<&str> = COMMON_WORDS.iter().map(String::as_str).collect();
    EXTENDED_WORDS
        .iter()
        .filter(|word| !common_words.contains(word.as_str()))
        .cloned()
        .collect()
}

fn build_easy_words() -> Vec<String> {
    let common_words: Vec<String> = COMMON_WORDS
        .iter()
        .filter(|word| word.len() <= 6 && word_difficulty_score(word) <= 6)
        .cloned()
        .collect();

    merge_unique_word_lists(&[STARTER_WORDS.as_slice(), common_words.as_slice()])
}

fn build_steady_words() -> Vec<String> {
    let primary: Vec<String> = COMMON_WORDS
        .iter()
        .filter(|word| {
            let score = word_difficulty_score(word);
            (6..=8).contains(&score)
        })
        .cloned()
        .collect();
    let support: Vec<String> = COMMON_WORDS
        .iter()
        .filter(|word| (6..=8).contains(&word.len()))
        .cloned()
        .collect();

    merge_unique_word_lists(&[primary.as_slice(), support.as_slice()])
}

fn build_tricky_words() -> Vec<String> {
    let common_words: Vec<String> = COMMON_WORDS
        .iter()
        .filter(|word| {
            let score = word_difficulty_score(word);
            (8..=10).contains(&score)
        })
        .cloned()
        .collect();
    let extended_words: Vec<String> = EXTENDED_ONLY_WORDS
        .iter()
        .filter(|word| {
            let score = word_difficulty_score(word);
            (8..=11).contains(&score) && word.len() >= 6
        })
        .cloned()
        .collect();

    merge_unique_word_lists(&[common_words.as_slice(), extended_words.as_slice()])
}

fn build_storm_words() -> Vec<String> {
    let common_words: Vec<String> = COMMON_WORDS
        .iter()
        .filter(|word| word_difficulty_score(word) >= 10 || word.len() >= 9)
        .cloned()
        .collect();
    let extended_words: Vec<String> = EXTENDED_ONLY_WORDS
        .iter()
        .filter(|word| word_difficulty_score(word) >= 10 || word.len() >= 8)
        .cloned()
        .collect();

    merge_unique_word_lists(&[common_words.as_slice(), extended_words.as_slice()])
}

fn merge_unique_word_lists(groups: &[&[String]]) -> Vec<String> {
    let mut words = Vec::new();
    let mut seen = HashSet::new();

    for group in groups {
        for word in *group {
            if seen.insert(word.clone()) {
                words.push(word.clone());
            }
        }
    }

    words
}

fn parse_word_list(raw: &str, minimum_length: usize) -> Vec<String> {
    let mut words = BTreeSet::new();

    for line in raw.lines() {
        let word = line.trim().to_ascii_lowercase();
        if is_valid_word(&word, minimum_length) {
            words.insert(word);
        }
    }

    words.into_iter().collect()
}

fn is_valid_word(word: &str, minimum_length: usize) -> bool {
    let length = word.len();
    (minimum_length..=12).contains(&length)
        && word.chars().all(|character| character.is_ascii_lowercase())
}

fn word_difficulty_score(word: &str) -> usize {
    let mut score = word.len();
    for pattern in [
        "th", "sh", "ch", "ph", "ck", "qu", "str", "ght", "tion", "ough", "scr", "spl", "chr",
    ] {
        if word.contains(pattern) {
            score += 2;
        }
    }

    for character in ['x', 'z', 'v', 'k', 'j', 'q'] {
        if word.contains(character) {
            score += 1;
        }
    }

    score
}

fn rolling_wpm(active_seconds: f64, recent_correct_events: &[f64]) -> f64 {
    if recent_correct_events.is_empty() {
        return 0.0;
    }

    let cutoff = (active_seconds - CURRENT_WPM_WINDOW_SECONDS).max(0.0);
    let first_recent = recent_correct_events
        .iter()
        .copied()
        .find(|timestamp| *timestamp >= cutoff)
        .unwrap_or(active_seconds);
    let char_count = recent_correct_events
        .iter()
        .filter(|timestamp| **timestamp >= cutoff)
        .count() as u32;

    if char_count == 0 {
        return 0.0;
    }

    let span_seconds = clamp(
        active_seconds - first_recent,
        PEAK_WPM_MIN_SECONDS,
        CURRENT_WPM_WINDOW_SECONDS,
    );
    compute_wpm(char_count, span_seconds)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_settings() -> GameSettings {
        GameSettings {
            reduced_motion: false,
            graphics_quality: "high".to_string(),
            difficulty: "medium".to_string(),
            sound_enabled: true,
        }
    }

    #[test]
    fn word_list_is_large_enough() {
        assert!(WORD_LIST.len() >= 3000);
    }

    #[test]
    fn higher_levels_bias_longer_words() {
        let early = bucket_weights(1);
        let late = bucket_weights(11);

        assert!(late.2 > early.2);
        assert!(late.0 < early.0);
        assert!(late.3 > early.3);
    }

    #[test]
    fn current_wpm_freezes_when_idle() {
        let mut session = GameSession::new(sample_settings(), 0.0);
        session.wpm_active_seconds = 10.0;
        session.recent_correct_events = vec![6.0, 6.4, 6.8, 7.2, 7.6, 8.0, 8.4, 8.8, 9.2, 9.6];
        session.typing_segment_active = false;

        let before = session.hud_snapshot().current_wpm;
        session.update(0.5);
        let after = session.hud_snapshot().current_wpm;

        assert!((after - before).abs() < 0.001);
    }

    #[test]
    fn recent_word_memory_blocks_immediate_repeats() {
        let mut session = GameSession::new(sample_settings(), 0.0);
        session.recent_words = vec!["echo".to_string()];
        let blocked: HashSet<String> = session.recent_words.iter().cloned().collect();

        let picked = pick_word(1, &blocked, &mut session.random);
        assert_ne!(picked, "echo");
    }

    #[test]
    fn ambiguous_prefix_stays_unlocked_until_unique() {
        let mut session = GameSession::new(sample_settings(), 0.0);
        session.words = vec![
            ActiveWord {
                id: "a".to_string(),
                text: "cable".to_string(),
                x: 0.3,
                y: 0.2,
                speed: 0.1,
                mistake_flash: 0.0,
            },
            ActiveWord {
                id: "b".to_string(),
                text: "cinder".to_string(),
                x: 0.7,
                y: 0.3,
                speed: 0.1,
                mistake_flash: 0.0,
            },
        ];

        session.handle_printable_input('c');
        assert!(session.target_word_id.is_none());

        let snapshot = session.render_snapshot();
        let highlighted = snapshot
            .words
            .iter()
            .filter(|word| word.typed_count == 1)
            .count();
        assert_eq!(highlighted, 2);

        session.handle_printable_input('i');
        assert_eq!(session.target_word_id.as_deref(), Some("b"));
    }

    #[test]
    fn waterline_rises_smoothly_after_miss() {
        let mut session = GameSession::new(sample_settings(), 0.0);
        let ground_line = session.ground_line();
        session.words = vec![ActiveWord {
            id: "a".to_string(),
            text: "storm".to_string(),
            x: 0.5,
            y: ground_line + 0.002,
            speed: 0.1,
            mistake_flash: 0.0,
        }];

        session.update(0.016);
        assert!(session.water_level > 0.0);
        assert!(session.water_level < 0.04);

        let immediate = session.water_level;
        session.update(0.4);
        assert!(session.water_level > immediate);
    }

    // --- Word pool construction ---

    #[test]
    fn word_pools_are_non_empty() {
        assert!(!EASY_WORDS.is_empty(), "easy pool empty");
        assert!(!STEADY_WORDS.is_empty(), "steady pool empty");
        assert!(!TRICKY_WORDS.is_empty(), "tricky pool empty");
        assert!(!STORM_WORDS.is_empty(), "storm pool empty");
        assert!(!STARTER_WORDS.is_empty(), "starter pool empty");
    }

    #[test]
    fn easy_words_skew_short() {
        let short_count = EASY_WORDS.iter().filter(|w| w.len() <= 6).count();
        let ratio = short_count as f64 / EASY_WORDS.len() as f64;
        assert!(
            ratio > 0.7,
            "easy pool should be mostly short words, got {:.1}%",
            ratio * 100.0
        );
    }

    // --- Difficulty profile ---

    #[test]
    fn difficulty_gets_harder_with_level() {
        let early = get_difficulty_profile(1, "medium");
        let late = get_difficulty_profile(10, "medium");

        assert!(late.spawn_interval_seconds < early.spawn_interval_seconds);
        assert!(late.fall_speed_normalized > early.fall_speed_normalized);
    }

    #[test]
    fn five_modes_ordered_slowest_to_fastest() {
        let level = 3;
        let very_easy = get_difficulty_profile(level, "veryEasy");
        let easy = get_difficulty_profile(level, "easy");
        let medium = get_difficulty_profile(level, "medium");
        let hard = get_difficulty_profile(level, "hard");
        let very_hard = get_difficulty_profile(level, "veryHard");

        assert!(very_easy.fall_speed_normalized < easy.fall_speed_normalized);
        assert!(easy.fall_speed_normalized < medium.fall_speed_normalized);
        assert!(medium.fall_speed_normalized < hard.fall_speed_normalized);
        assert!(hard.fall_speed_normalized < very_hard.fall_speed_normalized);

        assert!(very_easy.spawn_interval_seconds > easy.spawn_interval_seconds);
        assert!(easy.spawn_interval_seconds > medium.spawn_interval_seconds);
        assert!(medium.spawn_interval_seconds > hard.spawn_interval_seconds);
        assert!(hard.spawn_interval_seconds > very_hard.spawn_interval_seconds);
    }

    // --- Session lifecycle via EngineManager ---

    #[test]
    fn create_session_returns_valid_initial_frame() {
        let manager = EngineManager::default();
        let frame = manager.create_session(sample_settings(), 0.0).unwrap();

        assert!(!frame.session_id.is_empty());
        assert_eq!(frame.hud.level, 1);
        assert_eq!(frame.hud.score, 0);
        assert_eq!(frame.hud.combo, 0);
        assert!(!frame.hud.is_paused);
        assert!(!frame.hud.is_game_over);
    }

    #[test]
    fn tick_advances_elapsed_time() {
        let manager = EngineManager::default();
        let frame = manager.create_session(sample_settings(), 0.0).unwrap();
        let id = frame.session_id;

        let ticked = manager.tick_session(&id, 0.5, vec![]).unwrap();
        assert!(ticked.hud.elapsed_seconds > 0.0);
    }

    #[test]
    fn destroy_session_removes_it() {
        let manager = EngineManager::default();
        let frame = manager.create_session(sample_settings(), 0.0).unwrap();
        let id = frame.session_id;

        manager.destroy_session(&id).unwrap();

        let result = manager.tick_session(&id, 0.1, vec![]);
        assert!(result.is_err());
    }

    #[test]
    fn tick_nonexistent_session_returns_not_found() {
        let manager = EngineManager::default();
        let result = manager.tick_session("fake-id", 0.1, vec![]);
        assert!(result.is_err());
    }

    // --- Waterline physics ---

    #[test]
    fn waterline_drops_on_clear() {
        let mut session = GameSession::new(sample_settings(), 0.0);
        session.target_water_level = 0.2;
        session.water_level = 0.2;

        session.words = vec![ActiveWord {
            id: "a".to_string(),
            text: "hi".to_string(),
            x: 0.5,
            y: 0.3,
            speed: 0.1,
            mistake_flash: 0.0,
        }];

        session.handle_printable_input('h');
        session.handle_printable_input('i');

        assert!(
            session.target_water_level < 0.2,
            "target should drop after clear"
        );
    }

    #[test]
    fn waterline_interpolates_toward_target() {
        let mut session = GameSession::new(sample_settings(), 0.0);
        session.target_water_level = 0.5;
        session.water_level = 0.0;

        // A single small step should move toward target but not reach it
        session.update_waterline(0.016);

        assert!(session.water_level > 0.0, "water should have risen");
        assert!(session.water_level < 0.5, "single step should not reach target");
    }

    // --- Scoring and combo ---

    #[test]
    fn clearing_words_increments_combo_and_score() {
        let mut session = GameSession::new(sample_settings(), 0.0);
        session.words = vec![ActiveWord {
            id: "a".to_string(),
            text: "go".to_string(),
            x: 0.5,
            y: 0.3,
            speed: 0.1,
            mistake_flash: 0.0,
        }];

        session.handle_printable_input('g');
        session.handle_printable_input('o');

        assert!(session.score > 0, "score should increase after clear");
        assert_eq!(session.combo, 1, "combo should be 1 after first clear");
    }

    #[test]
    fn combo_resets_on_miss() {
        let mut session = GameSession::new(sample_settings(), 0.0);

        // Build up a combo by clearing a word
        session.words = vec![ActiveWord {
            id: "a".to_string(),
            text: "go".to_string(),
            x: 0.5,
            y: 0.3,
            speed: 0.1,
            mistake_flash: 0.0,
        }];
        session.handle_printable_input('g');
        session.handle_printable_input('o');
        assert_eq!(session.combo, 1);

        // Now cause a miss by letting a word hit the ground
        let ground_line = session.ground_line();
        session.words.push(ActiveWord {
            id: "b".to_string(),
            text: "rain".to_string(),
            x: 0.5,
            y: ground_line + 0.01,
            speed: 0.1,
            mistake_flash: 0.0,
        });
        session.update(0.016);
        assert_eq!(session.combo, 0, "combo should reset after miss");
    }

    #[test]
    fn score_formula_matches_expected() {
        // base = 12 + len * 7, level_factor = 1 + (level-1)*0.11, combo = 1 + min(combo,20)*0.05
        let score = calculate_word_score(5, 1, 0);
        let expected: f64 = (12.0 + 5.0 * 7.0) * 1.0 * 1.0;
        assert_eq!(score, expected.round() as i64);

        let score_with_combo = calculate_word_score(5, 1, 10);
        let expected_combo: f64 = (12.0 + 5.0 * 7.0) * 1.0 * (1.0 + 10.0 * 0.05);
        assert_eq!(score_with_combo, expected_combo.round() as i64);
    }

    // --- Pause / Resume ---

    #[test]
    fn paused_session_does_not_advance_time() {
        let mut session = GameSession::new(sample_settings(), 0.0);
        session.set_paused(true);

        let before = session.elapsed_seconds;
        session.update(1.0);

        assert_eq!(
            session.elapsed_seconds, before,
            "elapsed time should not change while paused"
        );
    }

    #[test]
    fn resume_allows_time_progression() {
        let mut session = GameSession::new(sample_settings(), 0.0);
        session.set_paused(true);
        session.update(1.0);
        session.set_paused(false);
        session.update(0.5);

        assert!(
            session.elapsed_seconds > 0.0,
            "time should advance after resume"
        );
    }

    #[test]
    fn input_ignored_while_paused() {
        let mut session = GameSession::new(sample_settings(), 0.0);
        session.words = vec![ActiveWord {
            id: "a".to_string(),
            text: "go".to_string(),
            x: 0.5,
            y: 0.3,
            speed: 0.1,
            mistake_flash: 0.0,
        }];
        session.set_paused(true);

        session.handle_printable_input('g');
        assert!(session.typed_buffer.is_empty(), "input should be ignored while paused");
    }

    // --- Game over ---

    #[test]
    fn game_over_when_water_reaches_max() {
        let mut session = GameSession::new(sample_settings(), 0.0);
        session.water_level = 0.998;
        session.target_water_level = 1.0;

        // Keep ticking until game over triggers
        for _ in 0..200 {
            session.update_waterline(0.016);
            if session.game_over {
                break;
            }
        }

        assert!(session.game_over, "game should end when water reaches max");
        assert!((session.water_level - 1.0).abs() < 0.001);
    }

    #[test]
    fn game_over_session_stops_updating() {
        let mut session = GameSession::new(sample_settings(), 0.0);
        session.game_over = true;

        let before = session.elapsed_seconds;
        session.update(1.0);
        assert_eq!(
            session.elapsed_seconds, before,
            "game over session should not advance"
        );
    }

    #[test]
    fn game_over_produces_end_summary() {
        let mut session = GameSession::new(sample_settings(), 0.0);
        session.elapsed_seconds = 30.0;
        session.score = 500;
        session.level = 3;
        session.game_over = true;

        let summary = session.end_summary();
        assert!(summary.is_some());

        let summary = summary.unwrap();
        assert_eq!(summary.score, 500);
        assert_eq!(summary.level_reached, 3);
        assert_eq!(summary.mode, "medium");
    }

    #[test]
    fn no_end_summary_while_playing() {
        let session = GameSession::new(sample_settings(), 0.0);
        assert!(session.end_summary().is_none());
    }

    // --- Utility functions ---

    #[test]
    fn word_difficulty_score_accounts_for_patterns() {
        let simple = word_difficulty_score("cat");
        let complex = word_difficulty_score("thought");

        assert!(complex > simple, "thought should score higher than cat");
    }

    #[test]
    fn compute_accuracy_handles_zero() {
        assert_eq!(compute_accuracy(0, 0), 0.0);
        assert!((compute_accuracy(8, 10) - 0.8).abs() < 0.001);
    }
}
