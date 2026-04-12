import type { LessonProgress } from '@downpour/shared';
import { useCallback, useEffect, useState } from 'react';
import { loadLessonProgress, persistLessonProgress } from '../tauri/storage';
import { toErrorMessage } from './errors';

export interface LessonCompletionInput {
  lessonId: string;
  stars: number;
  bestWpm: number;
  bestAccuracy: number;
}

export interface UseLearnProgressResult {
  progress: Record<string, LessonProgress>;
  progressLoading: boolean;
  refreshProgress: () => Promise<void>;
  markLessonComplete: (input: LessonCompletionInput) => Promise<void>;
}

function toMap(entries: LessonProgress[]): Record<string, LessonProgress> {
  const map: Record<string, LessonProgress> = {};
  for (const entry of entries) {
    map[entry.lessonId] = entry;
  }
  return map;
}

export function useLearnProgress(
  setRuntimeError: (error: string | null) => void,
): UseLearnProgressResult {
  const [progress, setProgress] = useState<Record<string, LessonProgress>>({});
  const [progressLoading, setProgressLoading] = useState(true);

  const refreshProgress = useCallback(async () => {
    setProgressLoading(true);
    try {
      const entries = await loadLessonProgress();
      setProgress(toMap(entries));
    } catch (error) {
      setRuntimeError(toErrorMessage(error, 'Failed to load lesson progress.'));
    } finally {
      setProgressLoading(false);
    }
  }, [setRuntimeError]);

  useEffect(() => {
    void refreshProgress();
  }, [refreshProgress]);

  const markLessonComplete = useCallback(
    async ({ lessonId, stars, bestWpm, bestAccuracy }: LessonCompletionInput) => {
      const previous = progress[lessonId];
      const nextEntry: LessonProgress = {
        lessonId,
        completed: true,
        stars: Math.max(previous?.stars ?? 0, stars),
        bestWpm: Math.max(previous?.bestWpm ?? 0, bestWpm),
        bestAccuracy: Math.max(previous?.bestAccuracy ?? 0, bestAccuracy),
        updatedAt: new Date().toISOString(),
      };

      setProgress((current) => ({ ...current, [lessonId]: nextEntry }));

      try {
        await persistLessonProgress(nextEntry);
      } catch (error) {
        setRuntimeError(toErrorMessage(error, 'Failed to save lesson progress.'));
      }
    },
    [progress, setRuntimeError],
  );

  return { progress, progressLoading, refreshProgress, markLessonComplete };
}
