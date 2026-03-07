export type DifficultyMode = 'normal' | 'hard';

export type GraphicsQuality = 'high' | 'low';

export type SortKey = 'date' | 'score' | 'bestWpm';

export interface GameRecord {
  id: string;
  timestampIso: string;
  durationSeconds: number;
  score: number;
  accuracy: number;
  sessionBestWpm: number;
  averageWpm: number;
  levelReached: number;
  mistakes: number;
  misses: number;
  mode: DifficultyMode;
}

export type GameRecordInput = GameRecord;

export interface GameSettings {
  reducedMotion: boolean;
  graphicsQuality: GraphicsQuality;
  difficulty: DifficultyMode;
  soundEnabled: boolean;
}

export interface PersistedSnapshot {
  bestWpm: number;
  records: GameRecord[];
}
