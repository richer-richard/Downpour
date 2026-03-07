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

const SNAPSHOT_KEY = 'downpour.local.snapshot';

interface LocalSnapshot {
  bestWpm: number;
  records: GameRecord[];
}

function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
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

export async function loadRecords(): Promise<GameRecord[]> {
  if (isTauriRuntime()) {
    const records = await getRecordsCommand();
    return assertGameRecordArray(records);
  }

  return readLocalSnapshot().records;
}

export async function persistRecord(input: GameRecordInput): Promise<void> {
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
  if (isTauriRuntime()) {
    return getBestWpmCommand();
  }

  return readLocalSnapshot().bestWpm;
}

export async function persistBestWpm(value: number): Promise<void> {
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
  if (isTauriRuntime()) {
    await resetRecordsCommand();
    return;
  }

  writeLocalSnapshot({ bestWpm: 0, records: [] });
}
