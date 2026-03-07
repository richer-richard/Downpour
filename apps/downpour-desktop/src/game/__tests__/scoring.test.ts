import { describe, expect, it } from 'vitest';
import { calculateWordScore, comboMultiplier } from '../scoring';

describe('scoring', () => {
  it('increases with combo', () => {
    const noCombo = calculateWordScore(5, 2, 0).points;
    const combo = calculateWordScore(5, 2, 10).points;

    expect(combo).toBeGreaterThan(noCombo);
  });

  it('caps combo multiplier growth at 20 streak', () => {
    expect(comboMultiplier(20)).toBe(comboMultiplier(50));
  });
});
