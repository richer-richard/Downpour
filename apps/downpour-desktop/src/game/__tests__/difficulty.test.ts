import { describe, expect, it } from 'vitest';
import { getDifficultyProfile } from '../difficulty';

describe('difficulty profile', () => {
  it('gets harder over time', () => {
    const easy = getDifficultyProfile(1, 'normal');
    const hard = getDifficultyProfile(10, 'normal');

    expect(hard.spawnIntervalSeconds).toBeLessThan(easy.spawnIntervalSeconds);
    expect(hard.fallSpeedNormalized).toBeGreaterThan(easy.fallSpeedNormalized);
    expect(hard.maxConcurrentWords).toBeGreaterThanOrEqual(easy.maxConcurrentWords);
  });

  it('hard mode starts faster', () => {
    const normal = getDifficultyProfile(1, 'normal');
    const hard = getDifficultyProfile(1, 'hard');

    expect(hard.fallSpeedNormalized).toBeGreaterThan(normal.fallSpeedNormalized);
    expect(hard.spawnIntervalSeconds).toBeLessThan(normal.spawnIntervalSeconds);
  });
});
