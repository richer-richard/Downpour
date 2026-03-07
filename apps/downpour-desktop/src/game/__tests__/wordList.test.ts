import { describe, expect, it } from 'vitest';
import { EASY_WORDS, STORM_WORDS } from '../wordBuckets';
import { COMMON_WORDS, EXTENDED_WORDS, STARTER_WORDS } from '../wordList';

describe('word lists', () => {
  it('loads a large common corpus of real words', () => {
    expect(COMMON_WORDS.length).toBeGreaterThan(50000);
    expect(EXTENDED_WORDS.length).toBeGreaterThan(COMMON_WORDS.length);
    expect(COMMON_WORDS).toContain('window');
    expect(COMMON_WORDS).toContain('garden');
    expect(STARTER_WORDS).toContain('rain');
  });

  it('keeps gameplay pools lowercase and sensible', () => {
    expect(EASY_WORDS).toContain('river');
    expect(STORM_WORDS.some((word) => word.length >= 8)).toBe(true);
    expect(COMMON_WORDS.every((word) => /^[a-z]+$/.test(word))).toBe(true);
  });
});
