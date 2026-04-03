import type { GameRecord } from '@downpour/shared';
import { useCallback, useEffect, useState } from 'react';
import { loadBestWpm, loadRecords } from '../tauri/storage';
import { toErrorMessage } from './errors';

export interface UseBootstrapResult {
  booting: boolean;
  bootError: string | null;
  globalBestWpm: number;
  setGlobalBestWpm: (value: number) => void;
  initialRecords: GameRecord[];
  retry: () => void;
}

export function useBootstrap(): UseBootstrapResult {
  const [booting, setBooting] = useState(true);
  const [bootError, setBootError] = useState<string | null>(null);
  const [globalBestWpm, setGlobalBestWpm] = useState(0);
  const [initialRecords, setInitialRecords] = useState<GameRecord[]>([]);

  const bootstrapApp = useCallback(async () => {
    setBooting(true);
    setBootError(null);

    try {
      const [best, records] = await Promise.all([loadBestWpm(), loadRecords()]);
      setGlobalBestWpm(best);
      setInitialRecords(records);
    } catch (error) {
      setBootError(toErrorMessage(error, 'Failed to initialize local game data.'));
    } finally {
      setBooting(false);
    }
  }, []);

  useEffect(() => {
    void bootstrapApp();
  }, [bootstrapApp]);

  const retry = useCallback(() => {
    void bootstrapApp();
  }, [bootstrapApp]);

  return { booting, bootError, globalBestWpm, setGlobalBestWpm, initialRecords, retry };
}
