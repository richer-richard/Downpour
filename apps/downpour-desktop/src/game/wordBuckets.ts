import { WORD_LIST } from './wordList';

export type WordBucket = 'short' | 'medium' | 'long';

const SHORT_MIN = 3;
const SHORT_MAX = 4;
const MEDIUM_MIN = 5;
const MEDIUM_MAX = 7;
const LONG_MIN = 8;
const LONG_MAX = 12;

export const SHORT_WORDS = WORD_LIST.filter(
  (word) => word.length >= SHORT_MIN && word.length <= SHORT_MAX,
);
export const MEDIUM_WORDS = WORD_LIST.filter(
  (word) => word.length >= MEDIUM_MIN && word.length <= MEDIUM_MAX,
);
export const LONG_WORDS = WORD_LIST.filter((word) => word.length >= LONG_MIN && word.length <= LONG_MAX);

function clampBucket(bucket: WordBucket): string[] {
  switch (bucket) {
    case 'short':
      return SHORT_WORDS;
    case 'medium':
      return MEDIUM_WORDS;
    case 'long':
      return LONG_WORDS;
    default:
      return WORD_LIST;
  }
}

export function pickBucket(level: number): WordBucket {
  if (level <= 3) {
    return 'short';
  }

  if (level <= 7) {
    return Math.random() > 0.3 ? 'medium' : 'short';
  }

  if (level <= 12) {
    return Math.random() > 0.35 ? 'medium' : 'long';
  }

  return Math.random() > 0.2 ? 'long' : 'medium';
}

export function pickWord(
  level: number,
  activeWords: Set<string>,
  random: () => number,
): string {
  const bucket = pickBucket(level);
  const pool = clampBucket(bucket);

  if (pool.length === 0) {
    return WORD_LIST[Math.floor(random() * WORD_LIST.length)] ?? 'rain';
  }

  for (let attempts = 0; attempts < 20; attempts += 1) {
    const candidate = pool[Math.floor(random() * pool.length)];
    if (!activeWords.has(candidate)) {
      return candidate;
    }
  }

  return pool[Math.floor(random() * pool.length)] ?? 'storm';
}
