import type {
  GameSettings,
  HudSnapshot,
  ImpactEvent,
  RenderWord,
  SessionEndSummary,
  SessionRenderSnapshot,
} from '@downpour/shared';
import {
  GROUND_BASE_Y,
  LEVEL_UP_SECONDS,
  LEVEL_UP_WORDS,
  MODE_MODIFIER,
  RECENT_WORD_MEMORY,
  WATERLINE_CLEAR_DROP,
  WATERLINE_MISS_RISE_BASE,
  WATERLINE_MISS_RISE_PER_LETTER,
  WATERLINE_MISS_RISE_PER_LEVEL,
  WATERLINE_RISE_RANGE,
  WPM_ACTIVE_WINDOW_SECONDS,
} from './constants';
import { getDifficultyProfile } from './difficulty';
import { computeAccuracy, computeWpm } from './metrics';
import { calculateWordScore } from './scoring';
import { pickTargetWord } from './targeting';
import { pickWord } from './wordBuckets';

export type { HudSnapshot, SessionEndSummary } from '@downpour/shared';

interface ActiveWord {
  id: string;
  text: string;
  x: number;
  y: number;
  speed: number;
  typedCount: number;
  spawnTick: number;
  mistakeFlash: number;
}

export interface GameControllerOptions {
  settings: GameSettings;
  globalBestWpm: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function createRng(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

let idCounter = 0;

function nextId(): string {
  idCounter += 1;
  return `word-${idCounter}`;
}

export class GameController {
  private readonly settings: GameSettings;

  private readonly random: () => number;

  private words: ActiveWord[] = [];

  private pendingImpacts: ImpactEvent[] = [];

  private elapsedSeconds = 0;

  private level = 1;

  private score = 0;

  private combo = 0;

  private lives: number;

  private waterLevel = 0;

  private clearedWords = 0;

  private clearedSinceLevel = 0;

  private misses = 0;

  private mistakes = 0;

  private totalTypedChars = 0;

  private correctChars = 0;

  private typedBuffer = '';

  private targetWordId: string | null = null;

  private recentWords: string[] = [];

  private nextLevelAtSeconds = LEVEL_UP_SECONDS;

  private spawnAccumulator = 0;

  private spawnTickCounter = 0;

  private sessionBestWpm = 0;

  private wpmActiveSeconds = 0;

  private typingWindowRemaining = 0;

  private globalBestWpm: number;

  private paused = false;

  private gameOver = false;

  private wind = 0;

  constructor(options: GameControllerOptions) {
    this.settings = options.settings;
    this.globalBestWpm = options.globalBestWpm;
    this.lives = 0;
    this.random = createRng(Date.now());
  }

  public update(deltaSeconds: number): void {
    if (this.paused || this.gameOver) {
      return;
    }

    const dt = clamp(deltaSeconds, 0, 0.05);
    this.elapsedSeconds += dt;

    if (!this.settings.reducedMotion) {
      this.wind = Math.sin(this.elapsedSeconds * 0.35) * 0.2 + Math.sin(this.elapsedSeconds * 1.2) * 0.08;
    } else {
      this.wind = 0;
    }

    this.progressDifficulty();
    this.spawnWords(dt);
    this.updateWords(dt);

    if (this.typingWindowRemaining > 0) {
      const activeDt = Math.min(dt, this.typingWindowRemaining);
      this.wpmActiveSeconds += activeDt;
      this.typingWindowRemaining = Math.max(0, this.typingWindowRemaining - dt);
    }

    const currentWpm = computeWpm(this.correctChars, this.wpmActiveSeconds);
    this.sessionBestWpm = Math.max(this.sessionBestWpm, currentWpm);
  }

  public pause(): void {
    this.paused = true;
  }

  public resume(): void {
    if (!this.gameOver) {
      this.paused = false;
    }
  }

  public isPaused(): boolean {
    return this.paused;
  }

  public isGameOver(): boolean {
    return this.gameOver;
  }

  public getHudSnapshot(): HudSnapshot {
    const currentWpm = computeWpm(this.correctChars, this.wpmActiveSeconds);
    const accuracy = computeAccuracy(this.correctChars, this.totalTypedChars);

    return {
      elapsedSeconds: this.elapsedSeconds,
      level: this.level,
      score: this.score,
      combo: this.combo,
      lives: this.lives,
      waterLevel: this.waterLevel,
      accuracy,
      currentWpm,
      sessionBestWpm: this.sessionBestWpm,
      globalBestWpm: this.globalBestWpm,
      isPaused: this.paused,
      isGameOver: this.gameOver,
    };
  }

  public getRenderSnapshot(): SessionRenderSnapshot {
    const words: RenderWord[] = this.words.map((word) => ({
      id: word.id,
      text: word.text,
      x: word.x,
      y: word.y,
      typedCount: word.typedCount,
      speed: word.speed,
      mistakeFlash: word.mistakeFlash,
    }));

    return {
      elapsedSeconds: this.elapsedSeconds,
      waterLevel: this.waterLevel,
      wind: this.wind,
      groundLine: this.groundLine,
      words,
    };
  }

  public consumeImpacts(): ImpactEvent[] {
    const impacts = [...this.pendingImpacts];
    this.pendingImpacts.length = 0;
    return impacts;
  }

  public handlePrintableInput(character: string): void {
    if (this.paused || this.gameOver) {
      return;
    }

    const key = character.toLowerCase();
    if (!/^[a-z]$/.test(key)) {
      return;
    }

    this.totalTypedChars += 1;
    this.refreshTypingWindow();

    const target = this.targetWord;
    if (!target) {
      const selected = pickTargetWord(this.words, this.typedBuffer, key);
      if (!selected) {
        this.registerMistake();
        return;
      }

      const selectedWord = this.words.find((word) => word.id === selected.id);
      if (!selectedWord) {
        this.registerMistake();
        return;
      }

      this.targetWordId = selectedWord.id;
      this.applyCharacterToWord(selectedWord, key);
      return;
    }

    this.applyCharacterToWord(target, key);
  }

  public handleBackspace(): void {
    if (this.paused || this.gameOver) {
      return;
    }

    const target = this.targetWord;
    if (!target || target.typedCount <= 0) {
      return;
    }

    this.refreshTypingWindow();
    target.typedCount -= 1;
    this.typedBuffer = target.text.slice(0, target.typedCount);

    if (target.typedCount === 0) {
      this.targetWordId = null;
      this.typedBuffer = '';
    }
  }

  public markGlobalBest(bestWpm: number): void {
    this.globalBestWpm = Math.max(0, bestWpm);
  }

  public buildEndSummary(): SessionEndSummary {
    const accuracy = computeAccuracy(this.correctChars, this.totalTypedChars);
    const averageWpm = computeWpm(this.correctChars, this.wpmActiveSeconds);

    return {
      durationSeconds: this.elapsedSeconds,
      score: this.score,
      accuracy,
      sessionBestWpm: this.sessionBestWpm,
      averageWpm,
      levelReached: this.level,
      mistakes: this.mistakes,
      misses: this.misses,
      mode: this.settings.difficulty,
    };
  }

  private get targetWord(): ActiveWord | null {
    if (!this.targetWordId) {
      return null;
    }

    return this.words.find((word) => word.id === this.targetWordId) ?? null;
  }

  private get groundLine(): number {
    return GROUND_BASE_Y - this.waterLevel * WATERLINE_RISE_RANGE;
  }

  private progressDifficulty(): void {
    if (this.elapsedSeconds >= this.nextLevelAtSeconds || this.clearedSinceLevel >= LEVEL_UP_WORDS) {
      this.level += 1;
      this.nextLevelAtSeconds += LEVEL_UP_SECONDS;
      this.clearedSinceLevel = 0;
    }
  }

  private spawnWords(deltaSeconds: number): void {
    const profile = getDifficultyProfile(this.level, this.settings.difficulty);
    this.spawnAccumulator += deltaSeconds;

    while (
      this.spawnAccumulator >= profile.spawnIntervalSeconds &&
      this.words.length < profile.maxConcurrentWords
    ) {
      this.spawnAccumulator -= profile.spawnIntervalSeconds;
      this.spawnTickCounter += 1;

      const blocked = new Set([...this.words.map((word) => word.text), ...this.recentWords]);
      const text = pickWord(this.level, blocked, this.random);
      this.rememberWord(text);

      const x = 0.1 + this.random() * 0.8;
      const y = -0.05 - this.random() * 0.2;
      const speed = profile.fallSpeedNormalized * (0.85 + this.random() * 0.4);

      this.words.push({
        id: nextId(),
        text,
        x,
        y,
        speed,
        typedCount: 0,
        spawnTick: this.spawnTickCounter,
        mistakeFlash: 0,
      });
    }
  }

  private updateWords(deltaSeconds: number): void {
    const misses: ActiveWord[] = [];

    for (const word of this.words) {
      word.y += word.speed * deltaSeconds;
      if (word.mistakeFlash > 0) {
        word.mistakeFlash = Math.max(0, word.mistakeFlash - deltaSeconds * 3);
      }

      if (word.y >= this.groundLine) {
        misses.push(word);
      }
    }

    for (const missed of misses) {
      this.handleMiss(missed);
    }
  }

  private handleMiss(word: ActiveWord): void {
    this.words = this.words.filter((candidate) => candidate.id !== word.id);

    if (this.targetWordId === word.id) {
      this.targetWordId = null;
      this.typedBuffer = '';
    }

    this.misses += 1;
    this.combo = 0;

    const impactY = this.groundLine;
    const increment =
      WATERLINE_MISS_RISE_BASE +
      word.text.length * WATERLINE_MISS_RISE_PER_LETTER +
      this.level * WATERLINE_MISS_RISE_PER_LEVEL;
    this.waterLevel = clamp(this.waterLevel + increment, 0, 1);

    this.pendingImpacts.push({
      x: word.x,
      y: impactY,
      strength: 1.35 + word.text.length * 0.04,
      type: 'miss',
    });

    if (this.waterLevel >= 1) {
      this.endGame();
    }
  }

  private applyCharacterToWord(word: ActiveWord, character: string): void {
    const expected = word.text[word.typedCount]?.toLowerCase();

    if (character !== expected) {
      this.registerMistake(word);
      return;
    }

    word.typedCount += 1;
    this.correctChars += 1;
    this.typedBuffer = word.text.slice(0, word.typedCount);

    if (word.typedCount >= word.text.length) {
      this.handleWordClear(word);
    }
  }

  private registerMistake(word?: ActiveWord): void {
    this.mistakes += 1;
    this.combo = 0;
    if (word) {
      word.mistakeFlash = 1;
    }
  }

  private handleWordClear(word: ActiveWord): void {
    const { points } = calculateWordScore(word.text.length, this.level, this.combo);

    this.score += points;
    this.combo += 1;
    this.clearedWords += 1;
    this.clearedSinceLevel += 1;
    this.waterLevel = Math.max(0, this.waterLevel - WATERLINE_CLEAR_DROP);

    this.pendingImpacts.push({
      x: word.x,
      y: word.y,
      strength: 0.55,
      type: 'clear',
    });

    this.words = this.words.filter((candidate) => candidate.id !== word.id);

    if (this.targetWordId === word.id) {
      this.targetWordId = null;
      this.typedBuffer = '';
    }
  }

  private endGame(): void {
    this.paused = false;
    this.gameOver = true;
  }

  private rememberWord(word: string): void {
    this.recentWords.push(word);

    if (this.recentWords.length > RECENT_WORD_MEMORY) {
      this.recentWords.splice(0, this.recentWords.length - RECENT_WORD_MEMORY);
    }
  }

  private refreshTypingWindow(): void {
    this.typingWindowRemaining = WPM_ACTIVE_WINDOW_SECONDS;
  }
}
