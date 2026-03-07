import { invoke } from '@tauri-apps/api/core';
import type { GameRecord, GameRecordInput } from '@downpour/shared';

export async function getRecordsCommand(): Promise<GameRecord[]> {
  return invoke<GameRecord[]>('get_records');
}

export async function saveRecordCommand(record: GameRecordInput): Promise<void> {
  await invoke('save_record', { record });
}

export async function getBestWpmCommand(): Promise<number> {
  return invoke<number>('get_best_wpm');
}

export async function setBestWpmCommand(value: number): Promise<void> {
  await invoke('set_best_wpm', { value });
}

export async function resetRecordsCommand(): Promise<void> {
  await invoke('reset_records');
}
