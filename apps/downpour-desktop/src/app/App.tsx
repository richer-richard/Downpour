import type { GameRecordInput } from '@downpour/shared';
import { useCallback, useMemo, useState } from 'react';
import type { SessionEndSummary } from '../game/gameController';
import { persistBestWpm, persistRecord } from '../tauri/storage';
import { toErrorMessage } from './errors';
import { useBootstrap } from './useBootstrap';
import { useRecords } from './useRecords';
import { useSettings } from './useSettings';
import { EndScreen } from '../ui/screens/EndScreen';
import { GameScreen } from '../ui/screens/GameScreen';
import { RecordsScreen } from '../ui/screens/RecordsScreen';
import { SettingsScreen } from '../ui/screens/SettingsScreen';
import { StartScreen } from '../ui/screens/StartScreen';

export type AppView = 'start' | 'playing' | 'ended' | 'records' | 'settings';

export function App() {
  const [view, setView] = useState<AppView>('start');
  const [sessionSummary, setSessionSummary] = useState<SessionEndSummary | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [sessionKey, setSessionKey] = useState(0);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);

  const { settings, setSettings } = useSettings();
  const { booting, bootError, globalBestWpm, setGlobalBestWpm, initialRecords, retry } = useBootstrap();
  const { records, recordsLoading, refreshRecords, resetRecords } = useRecords(
    initialRecords,
    setGlobalBestWpm,
    setRuntimeError,
  );

  const onStart = useCallback(() => {
    setSaveStatus('idle');
    setSessionSummary(null);
    setRuntimeError(null);
    setSessionKey((value) => value + 1);
    setView('playing');
  }, []);

  const onOpenRecords = useCallback(async () => {
    const ok = await refreshRecords();
    if (ok) {
      setView('records');
    }
  }, [refreshRecords]);

  const onOpenSettings = useCallback(() => {
    setRuntimeError(null);
    setView('settings');
  }, []);

  const onBackToStart = useCallback(() => {
    setView('start');
  }, []);

  const onRunEnd = useCallback(
    (summary: SessionEndSummary) => {
      setSessionSummary(summary);
      setSaveStatus('saving');
      setView('ended');

      const record: GameRecordInput = {
        id: crypto.randomUUID(),
        timestampIso: new Date().toISOString(),
        durationSeconds: summary.durationSeconds,
        score: summary.score,
        accuracy: summary.accuracy,
        sessionBestWpm: summary.sessionBestWpm,
        averageWpm: summary.averageWpm,
        levelReached: summary.levelReached,
        mistakes: summary.mistakes,
        misses: summary.misses,
        mode: summary.mode,
      };

      void (async () => {
        try {
          await persistRecord(record);

          if (record.sessionBestWpm > globalBestWpm) {
            await persistBestWpm(record.sessionBestWpm);
            setGlobalBestWpm(record.sessionBestWpm);
          }

          setRuntimeError(null);
          setSaveStatus('saved');
        } catch (error) {
          setRuntimeError(toErrorMessage(error, 'Failed to save session record.'));
          setSaveStatus('error');
        }
      })();
    },
    [globalBestWpm, setGlobalBestWpm],
  );

  const body = useMemo(() => {
    if (booting) {
      return (
        <div className="grid min-h-screen place-items-center px-4">
          <div className="glass-panel max-w-lg rounded-xl p-6 text-center text-cyan-100">
            <h1 className="mb-3 font-display text-2xl uppercase tracking-[0.22em]">Downpour</h1>
            <p className="text-cyan-100/80">Initializing game systems...</p>
          </div>
        </div>
      );
    }

    if (bootError) {
      return (
        <div className="grid min-h-screen place-items-center px-4">
          <div className="glass-panel max-w-2xl rounded-xl p-6 text-center text-cyan-100">
            <h1 className="mb-3 font-display text-2xl uppercase tracking-[0.2em]">Startup Error</h1>
            <p className="mb-4 text-cyan-50/90">{bootError}</p>
            <button
              className="rounded-md border border-cyan-300/50 bg-cyan-300/10 px-4 py-2 font-display text-sm uppercase tracking-[0.2em] text-cyan-100"
              onClick={retry}
              type="button"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    if (view === 'playing') {
      return (
        <GameScreen
          key={sessionKey}
          settings={settings}
          globalBestWpm={globalBestWpm}
          onRunEnd={onRunEnd}
          onBackToStart={onBackToStart}
        />
      );
    }

    if (view === 'records') {
      return (
        <RecordsScreen
          records={records}
          loading={recordsLoading}
          onRefresh={async () => {
            await refreshRecords();
          }}
          onReset={resetRecords}
          onBack={onBackToStart}
        />
      );
    }

    if (view === 'settings') {
      return <SettingsScreen settings={settings} onChange={setSettings} onBack={onBackToStart} />;
    }

    if (view === 'ended' && sessionSummary) {
      return (
        <EndScreen
          summary={sessionSummary}
          saveStatus={saveStatus}
          onRestart={onStart}
          onOpenRecords={() => {
            void onOpenRecords();
          }}
          onBackToStart={onBackToStart}
        />
      );
    }

    return (
      <StartScreen
        bestWpm={globalBestWpm}
        onStart={onStart}
        onOpenRecords={() => {
          void onOpenRecords();
        }}
        onOpenSettings={onOpenSettings}
      />
    );
  }, [
    bootError,
    booting,
    globalBestWpm,
    onBackToStart,
    onOpenRecords,
    onOpenSettings,
    onRunEnd,
    onStart,
    records,
    recordsLoading,
    refreshRecords,
    resetRecords,
    retry,
    saveStatus,
    sessionKey,
    sessionSummary,
    settings,
    setSettings,
    view,
  ]);

  return (
    <>
      {runtimeError ? (
        <div className="fixed inset-x-4 top-4 z-50 rounded-md border border-red-300/50 bg-red-500/25 px-3 py-2 text-sm text-red-100">
          {runtimeError}
          <button
            className="ml-3 rounded border border-red-200/60 px-2 py-0.5 text-xs uppercase tracking-[0.12em]"
            onClick={() => {
              setRuntimeError(null);
            }}
            type="button"
          >
            Dismiss
          </button>
        </div>
      ) : null}
      {body}
    </>
  );
}
