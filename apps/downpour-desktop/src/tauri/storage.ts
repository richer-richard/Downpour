import {
  assertGameRecordArray,
  isGameRecordArray,
  sanitizeRecordInput,
  type GameRecord,
  type GameRecordInput,
} from '@downpour/shared';
import {
  getBestWpmCommand,
  getRecordsCommand,
  resetRecordsCommand,
  saveRecordCommand,
  setBestWpmCommand,
} from './commands';
import { isTauriRuntime } from './runtime';

const SNAPSHOT_KEY = 'downpour.local.snapshot';
const STORAGE_VERSION_KEY = 'downpour.storage.version';
const STORAGE_VERSION = 2;

let storageUpgradePromise: Promise<void> | null = null;

interface LocalSnapshot {
  bestWpm: number;
  records: GameRecord[];
}

function readLocalSnapshot(): LocalSnapshot {
  if (typeof window === 'undefined') {
    return { bestWpm: 0, records: [] };
  }

  const raw = window.localStorage.getItem(SNAPSHOT_KEY);
  if (!raw) {
    return { bestWpm: 0, records: [] };
  }

  try {
    const parsed = JSON.parse(raw) as LocalSnapshot;
    return {
      bestWpm: typeof parsed.bestWpm === 'number' ? parsed.bestWpm : 0,
      records: isGameRecordArray(parsed.records) ? parsed.records : [],
    };
  } catch {
    return { bestWpm: 0, records: [] };
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
  if (typeof window === 'undefined' || readStorageVersion() >= STORAGE_VERSION) {
    return;
  }

  if (!storageUpgradePromise) {
    storageUpgradePromise = (async () => {
      if (isTauriRuntime()) {
        await Promise.all([resetRecordsCommand(), setBestWpmCommand(0)]);
      } else {
        writeLocalSnapshot({ bestWpm: 0, records: [] });
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

  writeLocalSnapshot({ bestWpm: 0, records: [] });
  writeStorageVersion(STORAGE_VERSION);
}
