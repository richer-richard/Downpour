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
    (1.55 - safeLevel * 0.07) / mod.spawnMultiplier,
    SPAWN_INTERVAL_MIN,
    1.55,
  );

  const fallSpeedNormalized = clamp(
    (0.098 + safeLevel * 0.015) * mod.speedMultiplier,
    FALL_SPEED_MIN,
    0.58,
  );

  const maxConcurrentWords = clamp(Math.floor(3 + safeLevel * 0.7), 3, mod.maxConcurrentWords);

  return {
    spawnIntervalSeconds,
    fallSpeedNormalized,
    maxConcurrentWords,
  };
}
