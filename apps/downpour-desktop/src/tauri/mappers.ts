import type { GameRecord, SortKey } from '@downpour/shared';

export type SortDirection = 'asc' | 'desc';

export function sortRecords(records: GameRecord[], key: SortKey, direction: SortDirection): GameRecord[] {
  const dir = direction === 'asc' ? 1 : -1;

  return [...records].sort((a, b) => {
    if (key === 'date') {
      const left = Date.parse(a.timestampIso);
      const right = Date.parse(b.timestampIso);
      return (left - right) * dir;
    }

    if (key === 'score') {
      return (a.score - b.score) * dir;
    }

    return (a.sessionBestWpm - b.sessionBestWpm) * dir;
  });
}
