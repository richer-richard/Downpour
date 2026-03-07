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

interface BucketWeights {
  short: number;
  medium: number;
  long: number;
}

function bucketWeights(level: number): BucketWeights {
  if (level <= 2) {
    return { short: 0.88, medium: 0.12, long: 0 };
  }

  if (level <= 4) {
    return { short: 0.62, medium: 0.38, long: 0 };
  }

  if (level <= 7) {
    return { short: 0.24, medium: 0.64, long: 0.12 };
  }

  if (level <= 10) {
    return { short: 0.08, medium: 0.54, long: 0.38 };
  }

  return { short: 0.04, medium: 0.28, long: 0.68 };
}

export function pickBucket(level: number, random: () => number): WordBucket {
  const weights = bucketWeights(level);
  const roll = random();

  if (roll < weights.short) {
    return 'short';
  }

  if (roll < weights.short + weights.medium) {
    return 'medium';
  }

  return 'long';
}

export function pickWord(
  level: number,
  blockedWords: Set<string>,
  random: () => number,
): string {
  const bucket = pickBucket(level, random);
  const pool = clampBucket(bucket);

  if (pool.length === 0) {
    return WORD_LIST[Math.floor(random() * WORD_LIST.length)] ?? 'rain';
  }

  for (let attempts = 0; attempts < 20; attempts += 1) {
    const candidate = pool[Math.floor(random() * pool.length)];
    if (!blockedWords.has(candidate)) {
      return candidate;
    }
  }

  for (let attempts = 0; attempts < 40; attempts += 1) {
    const candidate = WORD_LIST[Math.floor(random() * WORD_LIST.length)];
    if (candidate && !blockedWords.has(candidate)) {
      return candidate;
    }
  }

  return pool[Math.floor(random() * pool.length)] ?? 'storm';
}
