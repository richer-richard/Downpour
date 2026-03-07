import type { GameRecord, SortKey } from '@downpour/shared';
import { useMemo, useState } from 'react';
import { sortRecords, type SortDirection } from '../../tauri/mappers';
import { NeonButton } from '../components/NeonButton';
import { SortHeader } from '../components/SortHeader';

interface RecordsScreenProps {
  records: GameRecord[];
  loading: boolean;
  onRefresh: () => void;
  onReset: () => void;
  onBack: () => void;
}

export function RecordsScreen({ records, loading, onRefresh, onReset, onBack }: RecordsScreenProps) {
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [direction, setDirection] = useState<SortDirection>('desc');

  const sorted = useMemo(() => sortRecords(records, sortKey, direction), [direction, records, sortKey]);

  const onToggleSort = (key: SortKey): void => {
    if (key === sortKey) {
      setDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortKey(key);
    setDirection(key === 'date' ? 'desc' : 'desc');
  };

  const onConfirmReset = (): void => {
    const confirmed = window.confirm('Reset all records and best WPM?');
    if (confirmed) {
      onReset();
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="glass-panel w-full max-w-5xl rounded-2xl p-6 sm:p-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-3xl uppercase tracking-[0.18em] text-cyan-100">Records</h1>
          <div className="flex flex-wrap gap-2">
            <NeonButton onClick={onRefresh}>Refresh</NeonButton>
            <NeonButton onClick={onConfirmReset}>Reset</NeonButton>
            <NeonButton onClick={onBack}>Back</NeonButton>
          </div>
        </div>

        {loading ? <p className="py-8 text-cyan-100/70">Loading records...</p> : null}

        {!loading && sorted.length === 0 ? (
          <p className="py-8 text-cyan-100/70">No runs saved yet.</p>
        ) : null}

        {!loading && sorted.length > 0 ? (
          <div className="max-h-[60vh] overflow-auto rounded-lg border border-cyan-300/20">
            <table className="w-full min-w-[860px] border-collapse text-left text-sm">
              <thead className="sticky top-0 bg-[#081420]">
                <tr className="text-cyan-100/90">
                  <th className="px-3 py-2">
                    <SortHeader
                      label="Date"
                      sortKey="date"
                      activeSortKey={sortKey}
                      direction={direction}
                      onToggle={onToggleSort}
                    />
                  </th>
                  <th className="px-3 py-2">
                    <SortHeader
                      label="Score"
                      sortKey="score"
                      activeSortKey={sortKey}
                      direction={direction}
                      onToggle={onToggleSort}
                    />
                  </th>
                  <th className="px-3 py-2">
                    <SortHeader
                      label="Best WPM"
                      sortKey="bestWpm"
                      activeSortKey={sortKey}
                      direction={direction}
                      onToggle={onToggleSort}
                    />
                  </th>
                  <th className="px-3 py-2">Avg WPM</th>
                  <th className="px-3 py-2">Accuracy</th>
                  <th className="px-3 py-2">Duration</th>
                  <th className="px-3 py-2">Level</th>
                  <th className="px-3 py-2">Mode</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((record) => (
                  <tr key={record.id} className="border-t border-cyan-300/10 text-cyan-50/85">
                    <td className="px-3 py-2">{new Date(record.timestampIso).toLocaleString()}</td>
                    <td className="px-3 py-2">{record.score}</td>
                    <td className="px-3 py-2">{record.sessionBestWpm.toFixed(1)}</td>
                    <td className="px-3 py-2">{record.averageWpm.toFixed(1)}</td>
                    <td className="px-3 py-2">{(record.accuracy * 100).toFixed(1)}%</td>
                    <td className="px-3 py-2">{record.durationSeconds.toFixed(1)}s</td>
                    <td className="px-3 py-2">{record.levelReached}</td>
                    <td className="px-3 py-2 uppercase">{record.mode}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );
}
