export type DifficultyMode = 'normal' | 'hard';

export type GraphicsQuality = 'high' | 'low';

export type SortKey = 'date' | 'score' | 'bestWpm';

export type ImpactType = 'miss' | 'clear';

export type GameAction =
  | {
      type: 'printable';
      value: string;
    }
  | {
      type: 'backspace';
    }
  | {
      type: 'setPaused';
      paused: boolean;
    };

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

export interface RenderWord {
  id: string;
  text: string;
  x: number;
  y: number;
  typedCount: number;
  speed: number;
  mistakeFlash: number;
}

export interface ImpactEvent {
  x: number;
  y: number;
  strength: number;
  type: ImpactType;
}

export interface SessionRenderSnapshot {
  elapsedSeconds: number;
  waterLevel: number;
  wind: number;
  groundLine: number;
  words: RenderWord[];
}

export interface SessionEndSummary {
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

export interface HudSnapshot {
  elapsedSeconds: number;
  level: number;
  score: number;
  combo: number;
  lives: number;
  waterLevel: number;
  accuracy: number;
  currentWpm: number;
  sessionBestWpm: number;
  globalBestWpm: number;
  isPaused: boolean;
  isGameOver: boolean;
}

export interface GameSessionFrame {
  sessionId: string;
  hud: HudSnapshot;
  renderSnapshot: SessionRenderSnapshot;
  impacts: ImpactEvent[];
  endSummary: SessionEndSummary | null;
}
