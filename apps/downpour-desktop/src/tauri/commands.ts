import { invoke } from '@tauri-apps/api/core';
import type {
  GameAction,
  GameRecord,
  GameRecordInput,
  GameSessionFrame,
  GameSettings,
  LessonProgress,
  LessonProgressInput,
} from '@downpour/shared';

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

export async function createGameSessionCommand(
  settings: GameSettings,
  globalBestWpm: number,
): Promise<GameSessionFrame> {
  return invoke<GameSessionFrame>('create_game_session', { settings, globalBestWpm });
}

export async function tickGameSessionCommand(
  sessionId: string,
  deltaSeconds: number,
  actions: GameAction[],
): Promise<GameSessionFrame> {
  return invoke<GameSessionFrame>('tick_game_session', { sessionId, deltaSeconds, actions });
}

export async function destroyGameSessionCommand(sessionId: string): Promise<void> {
  await invoke('destroy_game_session', { sessionId });
}

export async function getLessonProgressCommand(): Promise<LessonProgress[]> {
  return invoke<LessonProgress[]>('get_lesson_progress');
}

export async function saveLessonProgressCommand(entry: LessonProgressInput): Promise<void> {
  await invoke('save_lesson_progress', { entry });
}
