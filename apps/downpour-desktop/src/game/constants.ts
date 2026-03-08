import type { DifficultyMode } from '@downpour/shared';

export const GROUND_BASE_Y = 0.84;
export const WATERLINE_TOP_Y = 0.14;
export const WATERLINE_RISE_RANGE = GROUND_BASE_Y - WATERLINE_TOP_Y;

export const WATERLINE_CLEAR_DROP = 0.01;
export const WATERLINE_MISS_RISE_BASE = 0.03;
export const WATERLINE_MISS_RISE_PER_LETTER = 0.0018;
export const WATERLINE_MISS_RISE_PER_LEVEL = 0.001;

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
  }
> = {
  normal: {
    speedMultiplier: 1,
    spawnMultiplier: 1,
  },
  hard: {
    speedMultiplier: 1.2,
    spawnMultiplier: 1.15,
  },
};
