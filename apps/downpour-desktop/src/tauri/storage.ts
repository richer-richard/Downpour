import {
  assertGameRecordArray,
  assertLessonProgressArray,
  isGameRecordArray,
  isLessonProgressArray,
  sanitizeLessonProgressInput,
  sanitizeRecordInput,
  type GameRecord,
  type GameRecordInput,
  type LessonProgress,
  type LessonProgressInput,
} from '@downpour/shared';
import {
  getBestWpmCommand,
  getLessonProgressCommand,
  getRecordsCommand,
  resetRecordsCommand,
  saveLessonProgressCommand,
  saveRecordCommand,
  setBestWpmCommand,
} from './commands';
import { isTauriRuntime } from './runtime';

const SNAPSHOT_KEY = 'downpour.local.snapshot';
const STORAGE_VERSION_KEY = 'downpour.storage.version';
const STORAGE_VERSION = 3;

let storageUpgradePromise: Promise<void> | null = null;

interface LocalSnapshot {
  bestWpm: number;
  records: GameRecord[];
  lessonProgress: LessonProgress[];
}

function emptySnapshot(): LocalSnapshot {
  return { bestWpm: 0, records: [], lessonProgress: [] };
}

function readLocalSnapshot(): LocalSnapshot {
  if (typeof window === 'undefined') {
    return emptySnapshot();
  }

  const raw = window.localStorage.getItem(SNAPSHOT_KEY);
  if (!raw) {
    return emptySnapshot();
  }

  try {
    const parsed = JSON.parse(raw) as Partial<LocalSnapshot>;
    return {
      bestWpm: typeof parsed.bestWpm === 'number' ? parsed.bestWpm : 0,
      records: isGameRecordArray(parsed.records) ? parsed.records : [],
      lessonProgress: isLessonProgressArray(parsed.lessonProgress) ? parsed.lessonProgress : [],
    };
  } catch {
    return emptySnapshot();
  }
}

function writeLocalSnapshot(snapshot: LocalSnapshot): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
}

function readStorageVersion(): number {
  if (typeof window === 'undefined') {
    return STORAGE_VERSION;
  }

  const raw = window.localStorage.getItem(STORAGE_VERSION_KEY);
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : 0;
}

function writeStorageVersion(version: number): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_VERSION_KEY, String(version));
}

async function ensureStorageUpgrade(): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }

  const currentVersion = readStorageVersion();
  if (currentVersion >= STORAGE_VERSION) {
    return;
  }

  if (!storageUpgradePromise) {
    storageUpgradePromise = (async () => {
      if (currentVersion < 2) {
        if (isTauriRuntime()) {
          await Promise.all([resetRecordsCommand(), setBestWpmCommand(0)]);
        } else {
          writeLocalSnapshot(emptySnapshot());
        }
      }

      if (currentVersion < 3 && !isTauriRuntime()) {
        const snapshot = readLocalSnapshot();
        if (!Array.isArray(snapshot.lessonProgress)) {
          snapshot.lessonProgress = [];
        }
        writeLocalSnapshot(snapshot);
      }

      writeStorageVersion(STORAGE_VERSION);
    })().catch((error) => {
      storageUpgradePromise = null;
      throw error;
    });
  }

  await storageUpgradePromise;
}

export async function loadRecords(): Promise<GameRecord[]> {
  await ensureStorageUpgrade();

  if (isTauriRuntime()) {
    const records = await getRecordsCommand();
    return assertGameRecordArray(records);
  }

  return readLocalSnapshot().records;
}

export async function persistRecord(input: GameRecordInput): Promise<void> {
  await ensureStorageUpgrade();

  const sanitized = sanitizeRecordInput(input);

  if (isTauriRuntime()) {
    await saveRecordCommand(sanitized);
    return;
  }

  const snapshot = readLocalSnapshot();
  snapshot.records = [sanitized, ...snapshot.records].slice(0, 1000);
  snapshot.bestWpm = Math.max(snapshot.bestWpm, sanitized.sessionBestWpm);
  writeLocalSnapshot(snapshot);
}

export async function loadBestWpm(): Promise<number> {
  await ensureStorageUpgrade();

  if (isTauriRuntime()) {
    return getBestWpmCommand();
  }

  return readLocalSnapshot().bestWpm;
}

export async function persistBestWpm(value: number): Promise<void> {
  await ensureStorageUpgrade();

  const safeValue = Math.max(0, value);

  if (isTauriRuntime()) {
    await setBestWpmCommand(safeValue);
    return;
  }

  const snapshot = readLocalSnapshot();
  snapshot.bestWpm = Math.max(snapshot.bestWpm, safeValue);
  writeLocalSnapshot(snapshot);
}

export async function resetAllRecords(): Promise<void> {
  await ensureStorageUpgrade();

  if (isTauriRuntime()) {
    await resetRecordsCommand();
    await setBestWpmCommand(0);
    writeStorageVersion(STORAGE_VERSION);
    return;
  }

  const snapshot = readLocalSnapshot();
  writeLocalSnapshot({ ...emptySnapshot(), lessonProgress: snapshot.lessonProgress });
  writeStorageVersion(STORAGE_VERSION);
}

export async function loadLessonProgress(): Promise<LessonProgress[]> {
  await ensureStorageUpgrade();

  if (isTauriRuntime()) {
    const entries = await getLessonProgressCommand();
    return assertLessonProgressArray(entries);
  }

  return readLocalSnapshot().lessonProgress;
}

export async function persistLessonProgress(input: LessonProgressInput): Promise<void> {
  await ensureStorageUpgrade();

  const sanitized = sanitizeLessonProgressInput(input);

  if (isTauriRuntime()) {
    await saveLessonProgressCommand(sanitized);
    return;
  }

  const snapshot = readLocalSnapshot();
  const existing = snapshot.lessonProgress.find((entry) => entry.lessonId === sanitized.lessonId);
  const merged: LessonProgress = existing
    ? {
        lessonId: sanitized.lessonId,
        completed: existing.completed || sanitized.completed,
        stars: Math.max(existing.stars, sanitized.stars),
        bestWpm: Math.max(existing.bestWpm, sanitized.bestWpm),
        bestAccuracy: Math.max(existing.bestAccuracy, sanitized.bestAccuracy),
        updatedAt: sanitized.updatedAt,
      }
    : sanitized;

  snapshot.lessonProgress = [
    ...snapshot.lessonProgress.filter((entry) => entry.lessonId !== sanitized.lessonId),
    merged,
  ];
  writeLocalSnapshot(snapshot);
}
