import { formatDifficultyMode, type GameRecord, type SortKey } from '@downpour/shared';
import { useMemo, useState } from 'react';
import { sortRecords, type SortDirection } from '../../tauri/mappers';
import { NeonButton } from '../components/NeonButton';
import { SortHeader } from '../components/SortHeader';

interface RecordsScreenProps {
  records: GameRecord[];
  loading: boolean;
  onRefresh: () => Promise<void>;
  onReset: () => Promise<void>;
  onBack: () => void;
}

export function RecordsScreen({ records, loading, onRefresh, onReset, onBack }: RecordsScreenProps) {
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [direction, setDirection] = useState<SortDirection>('desc');
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [resetting, setResetting] = useState(false);

  const sorted = useMemo(() => sortRecords(records, sortKey, direction), [direction, records, sortKey]);

  const onToggleSort = (key: SortKey): void => {
    if (key === sortKey) {
      setDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortKey(key);
    setDirection(key === 'date' ? 'desc' : 'desc');
  };

  const onBeginReset = (): void => {
    setConfirmingReset(true);
  };

  const onCancelReset = (): void => {
    if (!resetting) {
      setConfirmingReset(false);
    }
  };

  const onConfirmReset = async (): Promise<void> => {
    setResetting(true);

    try {
      await onReset();
      setConfirmingReset(false);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="glass-panel w-full max-w-5xl rounded-2xl p-6 sm:p-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-3xl uppercase tracking-[0.18em] text-cyan-100">Records</h1>
          <div className="flex flex-wrap gap-2">
            <NeonButton onClick={() => void onRefresh()} type="button">Refresh</NeonButton>
            <NeonButton onClick={onBeginReset} type="button">Reset</NeonButton>
            <NeonButton onClick={onBack} type="button">Back</NeonButton>
          </div>
        </div>

        {confirmingReset ? (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-300/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            <span>Delete all saved records and reset best WPM to zero?</span>
            <div className="flex flex-wrap gap-2">
              <NeonButton
                className="border-red-300/50 bg-red-400/15 text-red-100 hover:border-red-200 hover:bg-red-400/25"
                disabled={resetting}
                onClick={() => {
                  void onConfirmReset();
                }}
                type="button"
              >
                {resetting ? 'Resetting...' : 'Confirm Reset'}
              </NeonButton>
              <NeonButton disabled={resetting} onClick={onCancelReset} type="button">
                Cancel
              </NeonButton>
            </div>
          </div>
        ) : null}

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
                    <td className="px-3 py-2">{formatDifficultyMode(record.mode)}</td>
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
