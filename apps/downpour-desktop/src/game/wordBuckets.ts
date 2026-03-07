import { COMMON_WORDS, EXTENDED_WORDS, STARTER_WORDS, WORD_LIST } from './wordList';

export type WordBucket = 'easy' | 'steady' | 'tricky' | 'storm';

function uniqueWords(...groups: readonly string[][]): string[] {
  const unique = new Set<string>();

  for (const group of groups) {
    for (const word of group) {
      unique.add(word);
    }
  }

  return [...unique];
}

function difficultyScore(word: string): number {
  let score = word.length;
  for (const pattern of ['th', 'sh', 'ch', 'ph', 'ck', 'qu', 'str', 'ght', 'tion', 'ough', 'scr', 'spl', 'chr']) {
    if (word.includes(pattern)) {
      score += 2;
    }
  }

  for (const character of ['x', 'z', 'v', 'k', 'j', 'q']) {
    if (word.includes(character)) {
      score += 1;
    }
  }

  return score;
}

const commonWordSet = new Set(COMMON_WORDS);
const EXTENDED_ONLY_WORDS = EXTENDED_WORDS.filter((word) => !commonWordSet.has(word));

export const EASY_WORDS = uniqueWords(
  STARTER_WORDS,
  COMMON_WORDS.filter((word) => word.length <= 6 && difficultyScore(word) <= 6),
);

export const STEADY_WORDS = uniqueWords(
  COMMON_WORDS.filter((word) => {
    const score = difficultyScore(word);
    return score >= 6 && score <= 8;
  }),
  COMMON_WORDS.filter((word) => word.length >= 6 && word.length <= 8),
);

export const TRICKY_WORDS = uniqueWords(
  COMMON_WORDS.filter((word) => {
    const score = difficultyScore(word);
    return score >= 8 && score <= 10;
  }),
  EXTENDED_ONLY_WORDS.filter((word) => {
    const score = difficultyScore(word);
    return score >= 8 && score <= 11 && word.length >= 6;
  }),
);

export const STORM_WORDS = uniqueWords(
  COMMON_WORDS.filter((word) => difficultyScore(word) >= 10 || word.length >= 9),
  EXTENDED_ONLY_WORDS.filter((word) => difficultyScore(word) >= 10 || word.length >= 8),
);

function clampBucket(bucket: WordBucket): string[] {
  switch (bucket) {
    case 'easy':
      return EASY_WORDS;
    case 'steady':
      return STEADY_WORDS;
    case 'tricky':
      return TRICKY_WORDS;
    case 'storm':
      return STORM_WORDS;
    default:
      return WORD_LIST;
  }
}

interface BucketWeights {
  easy: number;
  steady: number;
  tricky: number;
  storm: number;
}

function bucketWeights(level: number): BucketWeights {
  if (level <= 2) {
    return { easy: 0.96, steady: 0.04, tricky: 0, storm: 0 };
  }

  if (level <= 4) {
    return { easy: 0.74, steady: 0.22, tricky: 0.04, storm: 0 };
  }

  if (level <= 7) {
    return { easy: 0.34, steady: 0.42, tricky: 0.2, storm: 0.04 };
  }

  if (level <= 10) {
    return { easy: 0.12, steady: 0.28, tricky: 0.36, storm: 0.24 };
  }

  return { easy: 0.05, steady: 0.15, tricky: 0.36, storm: 0.44 };
}

export function pickBucket(level: number, random: () => number): WordBucket {
  const weights = bucketWeights(level);
  const roll = random();

  if (roll < weights.easy) {
    return 'easy';
  }

  if (roll < weights.easy + weights.steady) {
    return 'steady';
  }

  if (roll < weights.easy + weights.steady + weights.tricky) {
    return 'tricky';
  }

  return 'storm';
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
    if (candidate && !blockedWords.has(candidate)) {
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
