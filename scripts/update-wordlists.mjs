#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, '..');
const OUTPUT_DIR = resolve(REPO_ROOT, 'apps/downpour-desktop/src/assets/wordlists');

const SOURCES = [
  {
    url: 'https://raw.githubusercontent.com/en-wl/wordlist-diff/master/en_US.txt',
    output: 'scowl-common.txt',
    minimumLength: 4,
  },
  {
    url: 'https://raw.githubusercontent.com/en-wl/wordlist-diff/master/en_US-large.txt',
    output: 'scowl-extended.txt',
    minimumLength: 4,
  },
];

const COPYRIGHT_URL =
  'https://raw.githubusercontent.com/en-wl/wordlist-diff/master/Copyright';

function isPlayableWord(word, minimumLength) {
  if (!/^[a-z]+$/.test(word)) {
    return false;
  }

  if (word.length < minimumLength || word.length > 12) {
    return false;
  }

  if (/(.)\1\1/.test(word)) {
    return false;
  }

  const vowelCount = word.match(/[aeiouy]/g)?.length ?? 0;
  if (word.length <= 5) {
    return vowelCount >= 2;
  }

  return vowelCount >= 1;
}

function buildWordList(rawText, minimumLength) {
  const unique = new Set();

  for (const line of rawText.split(/\r?\n/)) {
    const word = line.trim().toLowerCase();
    if (!isPlayableWord(word, minimumLength)) {
      continue;
    }

    unique.add(word);
  }

  return [...unique].sort((left, right) => left.localeCompare(right));
}

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });

  for (const source of SOURCES) {
    const rawText = await fetchText(source.url);
    const wordList = buildWordList(rawText, source.minimumLength);
    await writeFile(resolve(OUTPUT_DIR, source.output), `${wordList.join('\n')}\n`, 'utf8');
    console.log(`wrote ${source.output} with ${wordList.length} words`);
  }

  const copyright = await fetchText(COPYRIGHT_URL);
  await writeFile(resolve(OUTPUT_DIR, 'SCOWL-Copyright.txt'), copyright, 'utf8');
  console.log('wrote SCOWL-Copyright.txt');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
