import { computeAccuracy, computeWpm } from '../game/metrics';

export interface PracticeStats {
  wpm: number;
  accuracy: number;
  mistakes: number;
  correctChars: number;
  totalTyped: number;
  elapsedSeconds: number;
}

export interface PracticeState extends PracticeStats {
  currentWord: string;
  typed: string;
  completedWords: number;
  finished: boolean;
}

export interface PracticeControllerOptions {
  pool: string[];
  durationSeconds?: number;
  now?: () => number;
  random?: () => number;
}

function pickWord(pool: string[], random: () => number, avoid?: string): string {
  if (pool.length === 1) {
    return pool[0];
  }
  let next = pool[Math.floor(random() * pool.length)];
  let guard = 0;
  while (next === avoid && guard < 8) {
    next = pool[Math.floor(random() * pool.length)];
    guard += 1;
  }
  return next;
}

export class PracticeController {
  private readonly pool: string[];
  private readonly durationSeconds: number | undefined;
  private readonly now: () => number;
  private readonly random: () => number;

  private startedAt: number | null = null;
  private endedAt: number | null = null;
  private currentWord: string;
  private typed = '';
  private completedWords = 0;
  private correctChars = 0;
  private totalTyped = 0;
  private mistakes = 0;

  constructor(options: PracticeControllerOptions) {
    if (options.pool.length === 0) {
      throw new Error('PracticeController requires a non-empty word pool');
    }
    this.pool = options.pool;
    this.durationSeconds = options.durationSeconds;
    this.now = options.now ?? (() => Date.now());
    this.random = options.random ?? Math.random;
    this.currentWord = pickWord(this.pool, this.random);
  }

  private elapsedMs(): number {
    if (this.startedAt === null) {
      return 0;
    }
    const end = this.endedAt ?? this.now();
    return Math.max(0, end - this.startedAt);
  }

  private isTimeUp(): boolean {
    if (this.durationSeconds === undefined) {
      return false;
    }
    return this.elapsedMs() / 1000 >= this.durationSeconds;
  }

  handlePrintable(char: string): void {
    if (this.endedAt !== null) {
      return;
    }
    if (char.length !== 1) {
      return;
    }
    if (this.startedAt === null) {
      this.startedAt = this.now();
    }

    this.totalTyped += 1;

    // Treat space as a word-commit if word is fully typed.
    if (char === ' ') {
      if (this.typed === this.currentWord) {
        this.correctChars += 1; // count the space as a correct keystroke
        this.completedWords += 1;
        this.typed = '';
        this.currentWord = pickWord(this.pool, this.random, this.currentWord);
      } else {
        this.mistakes += 1;
      }
    } else {
      const expected = this.currentWord[this.typed.length];
      if (expected !== undefined && char === expected) {
        this.typed += char;
        this.correctChars += 1;
        if (this.typed === this.currentWord && this.durationSeconds === undefined && this.completedWords + 1 >= this.pool.length) {
          // fixed-pool finish condition — advance and mark complete
          this.completedWords += 1;
          this.typed = '';
          this.endedAt = this.now();
          return;
        }
      } else {
        this.mistakes += 1;
      }
    }

    if (this.isTimeUp()) {
      this.endedAt = this.now();
    }
  }

  handleBackspace(): void {
    if (this.endedAt !== null) {
      return;
    }
    if (this.typed.length > 0) {
      this.typed = this.typed.slice(0, -1);
    }
  }

  tick(): void {
    if (this.endedAt === null && this.startedAt !== null && this.isTimeUp()) {
      this.endedAt = this.now();
    }
  }

  stop(): void {
    if (this.endedAt === null) {
      this.endedAt = this.now();
    }
  }

  stats(): PracticeStats {
    const elapsedSeconds = this.elapsedMs() / 1000;
    return {
      wpm: computeWpm(this.correctChars, elapsedSeconds),
      accuracy: computeAccuracy(this.correctChars, this.totalTyped),
      mistakes: this.mistakes,
      correctChars: this.correctChars,
      totalTyped: this.totalTyped,
      elapsedSeconds,
    };
  }

  state(): PracticeState {
    return {
      ...this.stats(),
      currentWord: this.currentWord,
      typed: this.typed,
      completedWords: this.completedWords,
      finished: this.endedAt !== null,
    };
  }
}
