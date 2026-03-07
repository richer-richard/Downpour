import commonRaw from '../assets/wordlists/scowl-common.txt?raw';
import extendedRaw from '../assets/wordlists/scowl-extended.txt?raw';
import starterRaw from '../assets/wordlists/starter.txt?raw';

function parseWordList(raw: string, minimumLength: number): string[] {
  const unique = new Set<string>();

  for (const line of raw.split(/\r?\n/)) {
    const word = line.trim().toLowerCase();
    if (!word) {
      continue;
    }

    if (!/^[a-z]+$/.test(word)) {
      continue;
    }

    if (word.length < minimumLength || word.length > 12) {
      continue;
    }

    unique.add(word);
  }

  return [...unique].sort();
}

function mergeUnique(...groups: readonly string[][]): string[] {
  const unique = new Set<string>();

  for (const group of groups) {
    for (const word of group) {
      unique.add(word);
    }
  }

  return [...unique];
}

export const STARTER_WORDS = parseWordList(starterRaw, 3);
export const COMMON_WORDS = parseWordList(commonRaw, 4);
export const EXTENDED_WORDS = parseWordList(extendedRaw, 4);
export const WORD_LIST = mergeUnique(STARTER_WORDS, COMMON_WORDS, EXTENDED_WORDS);

if (COMMON_WORDS.length < 50000) {
  throw new Error('Common word list did not load correctly.');
}

if (EXTENDED_WORDS.length < COMMON_WORDS.length) {
  throw new Error('Extended word list should be at least as large as the common word list.');
}
