import type {
  DifficultyMode,
  GameRecord,
  GameRecordInput,
  GameSettings,
  GraphicsQuality,
  LessonProgress,
  LessonProgressInput,
  PersistedSnapshot,
} from './types';
import { isDifficultyMode, normalizeDifficultyMode } from './types';

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isDifficulty(value: unknown): value is DifficultyMode {
  return isDifficultyMode(value);
}

function isGraphicsQuality(value: unknown): value is GraphicsQuality {
  return value === 'high' || value === 'low';
}

export function isGameRecord(value: unknown): value is GameRecord {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const record = value as GameRecord;
  return (
    isString(record.id) &&
    isString(record.timestampIso) &&
    isFiniteNumber(record.durationSeconds) &&
    isFiniteNumber(record.score) &&
    isFiniteNumber(record.accuracy) &&
    isFiniteNumber(record.sessionBestWpm) &&
    isFiniteNumber(record.averageWpm) &&
    isFiniteNumber(record.levelReached) &&
    isFiniteNumber(record.mistakes) &&
    isFiniteNumber(record.misses) &&
    isDifficulty(record.mode)
  );
}

export function assertGameRecord(value: unknown): GameRecord {
  if (!isGameRecord(value)) {
    throw new Error('Invalid GameRecord payload.');
  }
  return value;
}

export function isGameRecordArray(value: unknown): value is GameRecord[] {
  return Array.isArray(value) && value.every(isGameRecord);
}

export function assertGameRecordArray(value: unknown): GameRecord[] {
  if (!isGameRecordArray(value)) {
    throw new Error('Invalid GameRecord[] payload.');
  }
  return value;
}

export function isGameRecordInput(value: unknown): value is GameRecordInput {
  return isGameRecord(value);
}

export function isGameSettings(value: unknown): value is GameSettings {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const settings = value as GameSettings;
  const normalizedDifficulty = normalizeDifficultyMode(settings.difficulty);

  if (normalizedDifficulty && settings.difficulty !== normalizedDifficulty) {
    settings.difficulty = normalizedDifficulty;
  }

  return (
    typeof settings.reducedMotion === 'boolean' &&
    isGraphicsQuality(settings.graphicsQuality) &&
    normalizedDifficulty !== null &&
    typeof settings.soundEnabled === 'boolean'
  );
}

export function isPersistedSnapshot(value: unknown): value is PersistedSnapshot {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const snapshot = value as PersistedSnapshot;
  return isFiniteNumber(snapshot.bestWpm) && isGameRecordArray(snapshot.records);
}

export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function isLessonProgress(value: unknown): value is LessonProgress {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const entry = value as LessonProgress;
  return (
    isString(entry.lessonId) &&
    typeof entry.completed === 'boolean' &&
    isFiniteNumber(entry.stars) &&
    isFiniteNumber(entry.bestWpm) &&
    isFiniteNumber(entry.bestAccuracy) &&
    isString(entry.updatedAt)
  );
}

export function isLessonProgressArray(value: unknown): value is LessonProgress[] {
  return Array.isArray(value) && value.every(isLessonProgress);
}

export function assertLessonProgressArray(value: unknown): LessonProgress[] {
  if (!isLessonProgressArray(value)) {
    throw new Error('Invalid LessonProgress[] payload.');
  }
  return value;
}

export function sanitizeLessonProgressInput(input: LessonProgressInput): LessonProgressInput {
  return {
    ...input,
    stars: Math.max(0, Math.min(3, Math.round(input.stars))),
    bestWpm: Math.max(0, input.bestWpm),
    bestAccuracy: clamp01(input.bestAccuracy),
  };
}

export function sanitizeRecordInput(input: GameRecordInput): GameRecordInput {
  return {
    ...input,
    durationSeconds: Math.max(0, input.durationSeconds),
    score: Math.max(0, Math.round(input.score)),
    accuracy: clamp01(input.accuracy),
    sessionBestWpm: Math.max(0, input.sessionBestWpm),
    averageWpm: Math.max(0, input.averageWpm),
    levelReached: Math.max(1, Math.round(input.levelReached)),
    mistakes: Math.max(0, Math.round(input.mistakes)),
    misses: Math.max(0, Math.round(input.misses)),
  };
}
