import type { GameRecordInput, GameSettings } from '@downpour/shared';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SessionEndSummary } from '../game/gameController';
import { loadBestWpm, loadRecords, persistBestWpm, persistRecord, resetAllRecords } from '../tauri/storage';
import type { AppView } from './router';
import { EndScreen } from '../ui/screens/EndScreen';
import { GameScreen } from '../ui/screens/GameScreen';
import { RecordsScreen } from '../ui/screens/RecordsScreen';
import { SettingsScreen } from '../ui/screens/SettingsScreen';
import { StartScreen } from '../ui/screens/StartScreen';

const SETTINGS_KEY = 'downpour.settings.v1';

const DEFAULT_SETTINGS: GameSettings = {
  reducedMotion: false,
  graphicsQuality: 'high',
  difficulty: 'normal',
  soundEnabled: true,
};

function toErrorMessage(value: unknown, fallback: string): string {
  if (value instanceof Error && value.message) {
    return value.message;
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }
  return fallback;
}

function loadStoredSettings(): GameSettings {
  if (typeof window === 'undefined') {
    return DEFAULT_SETTINGS;
  }

  const raw = window.localStorage.getItem(SETTINGS_KEY);
  if (!raw) {
    return DEFAULT_SETTINGS;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<GameSettings>;
    return {
      reducedMotion: Boolean(parsed.reducedMotion),
      graphicsQuality: parsed.graphicsQuality === 'low' ? 'low' : 'high',
      difficulty: parsed.difficulty === 'hard' ? 'hard' : 'normal',
      soundEnabled: parsed.soundEnabled !== false,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function App() {
  const [view, setView] = useState<AppView>('start');
  const [settings, setSettings] = useState<GameSettings>(() => loadStoredSettings());
  const [globalBestWpm, setGlobalBestWpm] = useState(0);
  const [records, setRecords] = useState<Awaited<ReturnType<typeof loadRecords>>>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [sessionSummary, setSessionSummary] = useState<SessionEndSummary | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [sessionKey, setSessionKey] = useState(0);
  const [booting, setBooting] = useState(true);
  const [bootError, setBootError] = useState<string | null>(null);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);

  useEffect(() => {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  const bootstrapApp = useCallback(async () => {
    setBooting(true);
    setBootError(null);
    setRuntimeError(null);

    try {
      const [best, initialRecords] = await Promise.all([loadBestWpm(), loadRecords()]);
      setGlobalBestWpm(best);
      setRecords(initialRecords);
    } catch (error) {
      setBootError(toErrorMessage(error, 'Failed to initialize local game data.'));
    } finally {
      setBooting(false);
    }
  }, []);

  useEffect(() => {
    void bootstrapApp();
  }, [bootstrapApp]);

  const refreshRecords = useCallback(async () => {
    setRecordsLoading(true);
    try {
      const values = await loadRecords();
      setRecords(values);
      return true;
    } catch (error) {
      setRuntimeError(toErrorMessage(error, 'Failed to load records.'));
      return false;
    } finally {
      setRecordsLoading(false);
    }
  }, []);

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

  const onResetRecords = useCallback(async () => {
    try {
      await resetAllRecords();
      setRecords([]);
      setGlobalBestWpm(0);
      setRuntimeError(null);
    } catch (error) {
      setRuntimeError(toErrorMessage(error, 'Failed to reset records.'));
    }
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
    [globalBestWpm],
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
              onClick={() => {
                void bootstrapApp();
              }}
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
          onRefresh={() => {
            void refreshRecords();
          }}
          onReset={() => {
            void onResetRecords();
          }}
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
    bootstrapApp,
    globalBestWpm,
    onBackToStart,
    onOpenRecords,
    onOpenSettings,
    onResetRecords,
    onRunEnd,
    onStart,
    records,
    recordsLoading,
    refreshRecords,
    saveStatus,
    sessionKey,
    sessionSummary,
    settings,
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
