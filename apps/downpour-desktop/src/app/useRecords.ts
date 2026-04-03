import type { GameRecord } from '@downpour/shared';
import { useCallback, useEffect, useState } from 'react';
import { loadBestWpm, loadRecords, resetAllRecords } from '../tauri/storage';
import { toErrorMessage } from './errors';

export interface UseRecordsResult {
  records: GameRecord[];
  recordsLoading: boolean;
  refreshRecords: () => Promise<boolean>;
  resetRecords: () => Promise<void>;
}

export function useRecords(
  initialRecords: GameRecord[],
  setGlobalBestWpm: (value: number) => void,
  setRuntimeError: (error: string | null) => void,
): UseRecordsResult {
  const [records, setRecords] = useState<GameRecord[]>(initialRecords);
  const [recordsLoading, setRecordsLoading] = useState(false);

  useEffect(() => {
    setRecords(initialRecords);
  }, [initialRecords]);

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
  }, [setRuntimeError]);

  const resetRecords = useCallback(async () => {
    setRecordsLoading(true);
    try {
      await resetAllRecords();
      const [best, clearedRecords] = await Promise.all([loadBestWpm(), loadRecords()]);
      setRecords(clearedRecords);
      setGlobalBestWpm(best);
      setRuntimeError(null);
    } catch (error) {
      setRuntimeError(toErrorMessage(error, 'Failed to reset records.'));
    } finally {
      setRecordsLoading(false);
    }
  }, [setGlobalBestWpm, setRuntimeError]);

  return { records, recordsLoading, refreshRecords, resetRecords };
}
