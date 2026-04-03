import type { DifficultyMode } from '@downpour/shared';

// The Y-coordinate where the "ground" sits in normalized screen space (0 = top, 1 = bottom).
// Words that fall past this line are missed.
export const GROUND_BASE_Y = 0.84;

// The highest the waterline can visually reach. When water_level = 1.0, the
// water surface sits at this Y, leaving only a sliver of screen for words.
export const WATERLINE_TOP_Y = 0.14;

// How many units of vertical space the waterline can cover (from ground to top).
// Used to convert the 0..1 water_level into a pixel-space offset.
export const WATERLINE_RISE_RANGE = GROUND_BASE_Y - WATERLINE_TOP_Y;

// How much the target waterline drops after clearing a word. Small on purpose —
// the player has to keep clearing consistently to push it back down.
export const WATERLINE_CLEAR_DROP = 0.01;

// Base amount the target waterline rises when a word is missed.
// Feels punishing enough to create tension, but not so harsh that a single
// miss in the early game is a death sentence.
export const WATERLINE_MISS_RISE_BASE = 0.03;

// Additional rise per letter in the missed word. Longer words hurt more when
// you let them slip, which nudges players toward clearing long words first.
export const WATERLINE_MISS_RISE_PER_LETTER = 0.0018;

// Additional rise per current level. Makes misses progressively more dangerous
// as the game speeds up, creating the pressure ramp in later levels.
export const WATERLINE_MISS_RISE_PER_LEVEL = 0.001;

// Exponential interpolation speed when the waterline is rising toward its
// target. Higher = snappier response. The asymmetry with FALL_RESPONSE is
// intentional — rises feel urgent, falls feel like a slow recovery.
export const WATERLINE_RISE_RESPONSE = 8.5;

// Exponential interpolation speed when the waterline is falling. Slower than
// rise response so the relief of clearing words feels gradual and earned.
export const WATERLINE_FALL_RESPONSE = 5.5;

// Seconds between level-ups (if the player hasn't cleared enough words first).
// 15 seconds keeps levels short enough that you feel the difficulty ramp without
// being overwhelmed at any single step.
export const LEVEL_UP_SECONDS = 15;

// Number of words cleared to trigger a level-up early. Rewards fast typers
// by advancing them before the timer, which also means harder words sooner.
export const LEVEL_UP_WORDS = 7;

// Floor for spawn interval — words never spawn faster than every 0.28s.
// Without this, very high levels would flood the screen instantly.
export const SPAWN_INTERVAL_MIN = 0.28;

// Floor for fall speed — words never fall slower than this. Prevents the
// very-easy mode from feeling completely static at early levels.
export const FALL_SPEED_MIN = 0.1;

// Base font size for words rendered on the canvas (in CSS pixels).
export const BASE_WORD_FONT_SIZE = 28;

// Window (in active-typing seconds) over which the rolling WPM is calculated.
// Shorter windows are spikier; 0.9s smooths out individual keystroke jitter
// while still responding quickly to speed changes.
export const WPM_ACTIVE_WINDOW_SECONDS = 0.9;

// How many recently-spawned words to remember for deduplication. Prevents
// the same word from appearing twice in quick succession, which feels buggy.
export const RECENT_WORD_MEMORY = 18;

// Per-difficulty modifiers that scale spawn rate, fall speed, and max
// concurrent word count. These are multipliers applied on top of the
// base difficulty curve (which ramps with level). Medium is the 1.0 baseline.
export const MODE_MODIFIER: Record<
  DifficultyMode,
  {
    speedMultiplier: number;
    spawnMultiplier: number;
    maxConcurrentWords: number;
  }
> = {
  veryEasy: {
    speedMultiplier: 0.76,
    spawnMultiplier: 0.78,
    maxConcurrentWords: 12,
  },
  easy: {
    speedMultiplier: 0.92,
    spawnMultiplier: 0.89,
    maxConcurrentWords: 13,
  },
  medium: {
    speedMultiplier: 1,
    spawnMultiplier: 1,
    maxConcurrentWords: 14,
  },
  hard: {
    speedMultiplier: 1.2,
    spawnMultiplier: 1.15,
    maxConcurrentWords: 16,
  },
  veryHard: {
    speedMultiplier: 1.32,
    spawnMultiplier: 1.3,
    maxConcurrentWords: 18,
  },
};
