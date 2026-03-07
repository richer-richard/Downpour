import { describe, expect, it } from 'vitest';
import { computeAccuracy, computeWpm } from '../metrics';

describe('metrics', () => {
  it('returns 0 accuracy with no typed chars', () => {
    expect(computeAccuracy(0, 0)).toBe(0);
  });

  it('computes standard wpm', () => {
    const wpm = computeWpm(250, 120);
    expect(wpm).toBeCloseTo(25);
  });
});
