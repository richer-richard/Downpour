import type { DifficultyMode } from '@downpour/shared';

export const GROUND_BASE_Y = 0.84;
export const WATERLINE_RISE_RANGE = 0.14;

export const NORMAL_LIVES = 5;
export const HARD_LIVES = 3;

export const LEVEL_UP_SECONDS = 15;
export const LEVEL_UP_WORDS = 7;

export const SPAWN_INTERVAL_MIN = 0.28;
export const FALL_SPEED_MIN = 0.1;

export const BASE_WORD_FONT_SIZE = 28;
export const WPM_ACTIVE_WINDOW_SECONDS = 0.9;
export const RECENT_WORD_MEMORY = 18;

export const MODE_MODIFIER: Record<
  DifficultyMode,
  {
    speedMultiplier: number;
    spawnMultiplier: number;
    lives: number;
  }
> = {
  normal: {
    speedMultiplier: 1,
    spawnMultiplier: 1,
    lives: NORMAL_LIVES,
  },
  hard: {
    speedMultiplier: 1.2,
    spawnMultiplier: 1.15,
    lives: HARD_LIVES,
  },
};
