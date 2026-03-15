import { describe, expect, it } from 'vitest';
import { getDifficultyProfile } from '../difficulty';

describe('difficulty profile', () => {
  it('gets harder over time', () => {
    const easy = getDifficultyProfile(1, 'medium');
    const hard = getDifficultyProfile(10, 'medium');

    expect(hard.spawnIntervalSeconds).toBeLessThan(easy.spawnIntervalSeconds);
    expect(hard.fallSpeedNormalized).toBeGreaterThan(easy.fallSpeedNormalized);
    expect(hard.maxConcurrentWords).toBeGreaterThanOrEqual(easy.maxConcurrentWords);
  });

  it('orders all five levels from slowest to fastest', () => {
    const level = 3;
    const veryEasy = getDifficultyProfile(level, 'veryEasy');
    const easy = getDifficultyProfile(level, 'easy');
    const medium = getDifficultyProfile(level, 'medium');
    const hard = getDifficultyProfile(level, 'hard');
    const veryHard = getDifficultyProfile(level, 'veryHard');

    expect(veryEasy.fallSpeedNormalized).toBeLessThan(easy.fallSpeedNormalized);
    expect(easy.fallSpeedNormalized).toBeLessThan(medium.fallSpeedNormalized);
    expect(medium.fallSpeedNormalized).toBeLessThan(hard.fallSpeedNormalized);
    expect(hard.fallSpeedNormalized).toBeLessThan(veryHard.fallSpeedNormalized);

    expect(veryEasy.spawnIntervalSeconds).toBeGreaterThan(easy.spawnIntervalSeconds);
    expect(easy.spawnIntervalSeconds).toBeGreaterThan(medium.spawnIntervalSeconds);
    expect(medium.spawnIntervalSeconds).toBeGreaterThan(hard.spawnIntervalSeconds);
    expect(hard.spawnIntervalSeconds).toBeGreaterThan(veryHard.spawnIntervalSeconds);
  });

  it('keeps legacy easy pacing at medium and hard unchanged', () => {
    const medium = getDifficultyProfile(1, 'medium');
    const hard = getDifficultyProfile(1, 'hard');

    expect(medium.spawnIntervalSeconds).toBeCloseTo(1.48, 5);
    expect(medium.fallSpeedNormalized).toBeCloseTo(0.113, 5);
    expect(hard.spawnIntervalSeconds).toBeCloseTo(1.28696, 5);
    expect(hard.fallSpeedNormalized).toBeCloseTo(0.1356, 5);
  });
});
