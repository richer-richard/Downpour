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

const GROUND_BASE_Y: f64 = 0.84;
const WATERLINE_RISE_RANGE: f64 = 0.14;
const LEVEL_UP_SECONDS: f64 = 15.0;
const LEVEL_UP_WORDS: u32 = 7;
const SPAWN_INTERVAL_MIN: f64 = 0.24;
const FALL_SPEED_MIN: f64 = 0.12;
const NORMAL_LIVES: u32 = 5;
const HARD_LIVES: u32 = 3;
const WPM_ACTIVE_WINDOW_SECONDS: f64 = 0.9;
const RECENT_WORD_MEMORY: usize = 18;
const MAX_CONCURRENT_NORMAL: u32 = 14;
const MAX_CONCURRENT_HARD: u32 = 16;

static WORD_LIST: LazyLock<Vec<String>> = LazyLock::new(build_word_list);
static SHORT_WORDS: LazyLock<Vec<String>> = LazyLock::new(|| {
    WORD_LIST
        .iter()
        .filter(|word| (3..=4).contains(&word.len()))
        .cloned()
        .collect()
});
static MEDIUM_WORDS: LazyLock<Vec<String>> = LazyLock::new(|| {
    WORD_LIST
        .iter()
        .filter(|word| (5..=7).contains(&word.len()))
        .cloned()
        .collect()
});
static LONG_WORDS: LazyLock<Vec<String>> = LazyLock::new(|| {
    WORD_LIST
        .iter()
        .filter(|word| (8..=12).contains(&word.len()))
        .cloned()
        .collect()
});

const CORE_WORDS: &[&str] = &[
    "rain",
    "storm",
    "typing",
    "neon",
    "shadow",
    "window",
    "street",
    "signal",
    "rocket",
    "glimmer",
    "memory",
    "thread",
    "rhythm",
    "moment",
    "focus",
    "vector",
    "ripple",
    "cascade",
    "anchor",
    "current",
    "charge",
    "static",
    "silver",
    "carbon",
    "ember",
    "echo",
    "flare",
    "lumen",
    "socket",
    "cipher",
    "matrix",
    "binary",
    "vertex",
    "quantum",
    "clock",
    "horizon",
    "tempo",
    "velocity",
    "pulse",
    "signal",
    "gloss",
    "bridge",
    "planet",
    "mercury",
    "saturn",
    "galaxy",
    "jupiter",
    "comet",
    "meteor",
    "planet",
    "future",
    "urban",
    "alley",
    "district",
    "engine",
    "device",
    "module",
    "portal",
    "dynamic",
    "method",
    "factor",
    "status",
    "module",
    "syntax",
    "shader",
    "render",
    "canvas",
    "kernel",
    "packet",
    "stream",
    "target",
    "vector",
    "ranger",
    "walker",
    "breaker",
    "mirror",
    "frozen",
    "copper",
    "magnet",
    "harbor",
    "lamps",
    "mosaic",
    "harvest",
    "thunder",
    "raindrop",
    "letter",
    "forest",
    "winter",
    "summer",
    "autumn",
    "spring",
    "breeze",
    "gust",
    "cloud",
    "vapor",
    "glacier",
    "ocean",
    "delta",
    "coast",
    "harvest",
    "meadow",
    "lighthouse",
    "arcade",
    "circuit",
    "satellite",
    "project",
    "monitor",
    "insight",
    "uplink",
    "network",
    "forecast",
    "drizzle",
    "downpour",
    "fountain",
    "meridian",
    "signaler",
    "postcard",
    "journey",
    "archive",
    "navigator",
    "lattice",
    "polar",
    "fusion",
    "nova",
    "stellar",
    "drifter",
    "voyager",
    "humming",
    "silence",
    "ceramic",
    "granite",
    "granular",
    "fabric",
    "canvas",
    "pixel",
    "outline",
    "origin",
    "planetary",
    "stormlight",
    "threshold",
    "waterline",
    "grounded",
    "lantern",
    "streetcar",
    "midnight",
    "railing",
    "smolder",
    "hollow",
    "silent",
    "kinetic",
    "upriver",
    "bottleneck",
    "downtown",
    "crosswind",
    "cathedral",
    "warehouse",
    "turnstile",
    "backlight",
    "riverstone",
    "semaphore",
    "luminance",
    "waterfront",
    "rainproof",
    "nightfall",
    "afterglow",
    "windward",
    "updraft",
    "starboard",
    "terminal",
    "framework",
    "operand",
    "runtime",
    "compile",
    "deltaflow",
    "streaming",
    "controller",
    "response",
    "payload",
    "snapshot",
    "glowline",
    "subtle",
    "elegant",
    "realism",
    "splash",
    "rivulet",
    "puddle",
    "spectrum",
    "density",
    "clarity",
    "precision",
    "balance",
    "momentum",
    "terrain",
    "polished",
    "gesture",
    "mechanic",
    "session",
    "record",
    "history",
    "timing",
    "average",
    "minimum",
    "maximum",
    "quality",
    "setting",
    "profile",
    "trigger",
    "camera",
    "layer",
    "forefront",
    "backdrop",
    "vignette",
    "ambient",
    "reflect",
    "shimmer",
    "nocturne",
    "crosswalk",
    "traffic",
    "avenue",
    "districts",
    "aluminum",
    "warehouse",
    "generator",
    "operator",
    "cobblestone",
    "quicksilver",
    "frequency",
    "transient",
    "infinite",
    "boundary",
    "northern",
    "southern",
    "eastern",
    "western",
    "junction",
    "assembly",
    "artifact",
    "fidelity",
    "gradient",
    "harmonic",
    "resonance",
    "overcast",
    "rainfall",
    "drifting",
    "lively",
    "threshold",
    "airborne",
    "soundscape",
    "luminous",
    "dispatch",
    "firewatch",
    "watchtower",
    "dockyard",
    "boardwalk",
    "shoreline",
    "synergy",
    "workflow",
    "signalpath",
    "telemetry",
    "interface",
    "overlay",
    "keyframe",
    "compositor",
    "persistence",
    "database",
    "transaction",
    "rollback",
    "migration",
    "cursor",
    "surface",
    "hologram",
    "moonlit",
    "riverbank",
    "undertow",
    "stability",
    "immersive",
    "playfield",
];

const PREFIXES: &[&str] = &[
    "ra", "ne", "cy", "lu", "br", "st", "mo", "di", "ca", "tr", "fl", "sp", "gl", "sh",
    "cl", "wi", "th", "pr", "ch", "fr", "bl", "gr", "vo", "qu", "ha", "me", "co", "po",
    "si", "ni",
];

const ROOTS: &[&str] = &[
    "nex",
    "rift",
    "line",
    "drop",
    "shade",
    "light",
    "trace",
    "pulse",
    "frame",
    "crest",
    "stream",
    "point",
    "stone",
    "field",
    "gale",
    "flux",
    "spark",
    "clock",
    "grid",
    "shore",
    "drift",
    "wave",
    "forge",
    "scope",
    "rail",
    "plane",
    "mark",
    "phase",
    "tide",
    "crest",
];

const SUFFIXES: &[&str] = &[
    "er", "ing", "ed", "ion", "al", "ory", "ance", "ist", "ive", "ure", "ent", "oid",
];

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
    typed_count: u32,
    spawn_tick: u64,
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
    typing_window_remaining: f64,
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
        let lives = if settings.difficulty == "hard" {
            HARD_LIVES
        } else {
            NORMAL_LIVES
        };

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
            lives,
            water_level: 0.0,
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
            typing_window_remaining: 0.0,
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
            self.wind =
                (self.elapsed_seconds * 0.35).sin() * 0.2 + (self.elapsed_seconds * 1.2).sin() * 0.08;
        } else {
            self.wind = 0.0;
        }

        self.progress_difficulty();
        self.spawn_words(dt);
        self.update_words(dt);

        if self.typing_window_remaining > 0.0 {
            let active_dt = dt.min(self.typing_window_remaining);
            self.wpm_active_seconds += active_dt;
            self.typing_window_remaining = (self.typing_window_remaining - dt).max(0.0);
        }

        let current_wpm = compute_wpm(self.correct_chars, self.wpm_active_seconds);
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
            current_wpm: compute_wpm(self.correct_chars, self.wpm_active_seconds),
            session_best_wpm: self.session_best_wpm,
            global_best_wpm: self.global_best_wpm,
            is_paused: self.paused,
            is_game_over: self.game_over,
        }
    }

    fn render_snapshot(&self) -> SessionRenderSnapshot {
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
                    typed_count: word.typed_count,
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
        self.refresh_typing_window();

        if let Some(target_id) = self.target_word_id.clone() {
            if let Some(index) = self.words.iter().position(|word| word.id == target_id) {
                self.apply_character_to_word(index, key);
                return;
            }
        }

        if let Some(index) = self.pick_target_index(&self.typed_buffer, key) {
            self.target_word_id = Some(self.words[index].id.clone());
            self.apply_character_to_word(index, key);
        } else {
            self.register_mistake(None);
        }
    }

    fn handle_backspace(&mut self) {
        if self.paused || self.game_over {
            return;
        }

        let Some(target_id) = self.target_word_id.clone() else {
            return;
        };
        let Some(index) = self.words.iter().position(|word| word.id == target_id) else {
            return;
        };
        if self.words[index].typed_count == 0 {
            return;
        }

        self.refresh_typing_window();
        self.words[index].typed_count -= 1;
        let typed_count = self.words[index].typed_count as usize;
        self.typed_buffer = self.words[index].text[..typed_count].to_string();

        if self.words[index].typed_count == 0 {
            self.target_word_id = None;
            self.typed_buffer.clear();
        }
    }

    fn pick_target_index(&self, current_buffer: &str, next_char: char) -> Option<usize> {
        let mut best: Option<(usize, f64, u64)> = None;
        let proposal = format!("{}{}", current_buffer, next_char);

        for (index, word) in self.words.iter().enumerate() {
            let typed_prefix = &word.text[..word.typed_count as usize];
            if typed_prefix != current_buffer || !word.text.starts_with(&proposal) {
                continue;
            }

            match best {
                None => best = Some((index, word.y, word.spawn_tick)),
                Some((_, best_y, best_spawn_tick)) => {
                    if word.y > best_y || ((word.y - best_y).abs() < f64::EPSILON && word.spawn_tick < best_spawn_tick)
                    {
                        best = Some((index, word.y, word.spawn_tick));
                    }
                }
            }
        }

        best.map(|(index, _, _)| index)
    }

    fn apply_character_to_word(&mut self, word_index: usize, character: char) {
        let expected = self.words[word_index]
            .text
            .chars()
            .nth(self.words[word_index].typed_count as usize)
            .unwrap_or_default();

        if character != expected {
            let word_id = self.words[word_index].id.clone();
            self.register_mistake(Some(word_id));
            return;
        }

        self.words[word_index].typed_count += 1;
        self.correct_chars += 1;
        let typed_count = self.words[word_index].typed_count as usize;
        self.typed_buffer = self.words[word_index].text[..typed_count].to_string();

        if self.words[word_index].typed_count as usize >= self.words[word_index].text.len() {
            let word_id = self.words[word_index].id.clone();
            self.handle_word_clear(&word_id);
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
        self.water_level = (self.water_level - 0.015).max(0.0);
        self.pending_impacts.push(ImpactEvent {
            x: word.x,
            y: word.y,
            strength: 0.55,
            r#type: "clear".to_string(),
        });

        self.words.remove(index);
        if self.target_word_id.as_deref() == Some(word_id) {
            self.target_word_id = None;
            self.typed_buffer.clear();
        }
    }

    fn progress_difficulty(&mut self) {
        if self.elapsed_seconds >= self.next_level_at_seconds || self.cleared_since_level >= LEVEL_UP_WORDS {
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
                typed_count: 0,
                spawn_tick: self.spawn_tick_counter,
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

        if self.target_word_id.as_deref() == Some(word_id) {
            self.target_word_id = None;
            self.typed_buffer.clear();
        }

        self.misses += 1;
        self.combo = 0;
        self.lives = self.lives.saturating_sub(1);

        let increment = 0.045 + word.text.len() as f64 * 0.003 + self.level as f64 * 0.0012;
        self.water_level = (self.water_level + increment).min(1.0);

        self.pending_impacts.push(ImpactEvent {
            x: word.x,
            y: self.ground_line(),
            strength: 1.35 + word.text.len() as f64 * 0.04,
            r#type: "miss".to_string(),
        });

        if self.lives == 0 || self.water_level >= 1.0 {
            self.end_game();
        }
    }

    fn end_game(&mut self) {
        self.paused = false;
        self.game_over = true;
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

    fn refresh_typing_window(&mut self) {
        self.typing_window_remaining = WPM_ACTIVE_WINDOW_SECONDS;
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
    let (speed_multiplier, spawn_multiplier, max_concurrent_words) = if difficulty == "hard" {
        (1.2, 1.15, MAX_CONCURRENT_HARD)
    } else {
        (1.0, 1.0, MAX_CONCURRENT_NORMAL)
    };

    DifficultyProfile {
        spawn_interval_seconds: clamp((1.35 - safe_level * 0.075) / spawn_multiplier, SPAWN_INTERVAL_MIN, 1.35),
        fall_speed_normalized: clamp((0.125 + safe_level * 0.018) * speed_multiplier, FALL_SPEED_MIN, 0.64),
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

fn bucket_weights(level: u32) -> (f64, f64, f64) {
    if level <= 2 {
        (0.88, 0.12, 0.0)
    } else if level <= 4 {
        (0.62, 0.38, 0.0)
    } else if level <= 7 {
        (0.24, 0.64, 0.12)
    } else if level <= 10 {
        (0.08, 0.54, 0.38)
    } else {
        (0.04, 0.28, 0.68)
    }
}

fn pick_bucket(level: u32, random: &mut SimpleRng) -> &'static [String] {
    let (short_weight, medium_weight, _) = bucket_weights(level);
    let roll = random.next_f64();
    if roll < short_weight {
        SHORT_WORDS.as_slice()
    } else if roll < short_weight + medium_weight {
        MEDIUM_WORDS.as_slice()
    } else {
        LONG_WORDS.as_slice()
    }
}

fn pick_word(level: u32, blocked_words: &HashSet<String>, random: &mut SimpleRng) -> String {
    let pool = pick_bucket(level, random);

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
    let mut words = BTreeSet::new();
    for word in CORE_WORDS {
        words.insert(word.to_lowercase());
    }

    for prefix in PREFIXES {
        for root in ROOTS {
            let combined = format!("{}{}", prefix, root);
            if is_valid_word(&combined) {
                words.insert(combined);
            }

            for suffix in SUFFIXES {
                let extended = format!("{}{}{}", prefix, root, suffix);
                if is_valid_word(&extended) {
                    words.insert(extended);
                }
            }
        }
    }

    let mut cleaned: Vec<String> = words.into_iter().collect();
    cleaned.truncate(3200);
    assert!(cleaned.len() >= 2000, "word list generation produced fewer than 2000 words");
    cleaned
}

fn is_valid_word(word: &str) -> bool {
    let length = word.len();
    (3..=12).contains(&length) && word.chars().all(|character| character.is_ascii_lowercase())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_settings() -> GameSettings {
        GameSettings {
            reduced_motion: false,
            graphics_quality: "high".to_string(),
            difficulty: "normal".to_string(),
            sound_enabled: true,
        }
    }

    #[test]
    fn word_list_is_large_enough() {
        assert!(WORD_LIST.len() >= 2000);
    }

    #[test]
    fn higher_levels_bias_longer_words() {
        let early = bucket_weights(1);
        let late = bucket_weights(11);

        assert!(late.2 > early.2);
        assert!(late.0 < early.0);
    }

    #[test]
    fn current_wpm_freezes_when_idle() {
        let mut session = GameSession::new(sample_settings(), 0.0);
        session.correct_chars = 25;
        session.wpm_active_seconds = 10.0;
        session.typing_window_remaining = 0.0;

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
}
