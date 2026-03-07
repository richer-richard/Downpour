import type { DifficultyMode } from '@downpour/shared';
import { MODE_MODIFIER, SPAWN_INTERVAL_MIN, FALL_SPEED_MIN } from './constants';

export interface DifficultyProfile {
  spawnIntervalSeconds: number;
  fallSpeedNormalized: number;
  maxConcurrentWords: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function getDifficultyProfile(level: number, mode: DifficultyMode): DifficultyProfile {
  const safeLevel = Math.max(1, level);
  const mod = MODE_MODIFIER[mode];

  const spawnIntervalSeconds = clamp(
    (1.45 - safeLevel * 0.055) / mod.spawnMultiplier,
    SPAWN_INTERVAL_MIN,
    1.45,
  );

  const fallSpeedNormalized = clamp(
    (0.11 + safeLevel * 0.013) * mod.speedMultiplier,
    FALL_SPEED_MIN,
    0.52,
  );

  const maxConcurrentWords = clamp(Math.floor(3 + safeLevel * 0.48), 3, mode === 'hard' ? 14 : 12);

  return {
    spawnIntervalSeconds,
    fallSpeedNormalized,
    maxConcurrentWords,
  };
}
