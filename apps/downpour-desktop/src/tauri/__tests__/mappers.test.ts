import { describe, expect, it } from 'vitest';
import type { GameRecord } from '@downpour/shared';
import { sortRecords } from '../mappers';

const records: GameRecord[] = [
  {
    id: 'a',
    timestampIso: '2026-01-01T00:00:00.000Z',
    durationSeconds: 10,
    score: 100,
    accuracy: 0.9,
    sessionBestWpm: 52,
    averageWpm: 45,
    levelReached: 3,
    mistakes: 2,
    misses: 1,
    mode: 'normal',
  },
  {
    id: 'b',
    timestampIso: '2026-02-01T00:00:00.000Z',
    durationSeconds: 20,
    score: 300,
    accuracy: 0.95,
    sessionBestWpm: 70,
    averageWpm: 60,
    levelReached: 6,
    mistakes: 1,
    misses: 1,
    mode: 'hard',
  },
];

describe('sortRecords', () => {
  it('sorts by score descending', () => {
    expect(sortRecords(records, 'score', 'desc')[0]?.id).toBe('b');
  });

  it('sorts by date ascending', () => {
    expect(sortRecords(records, 'date', 'asc')[0]?.id).toBe('a');
  });
});
