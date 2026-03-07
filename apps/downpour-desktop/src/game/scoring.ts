export interface ScoreResult {
  points: number;
  comboMultiplier: number;
}

function roundToInt(value: number): number {
  return Math.round(value);
}

export function comboMultiplier(comboStreak: number): number {
  return 1 + Math.min(comboStreak, 20) * 0.05;
}

export function calculateWordScore(wordLength: number, level: number, comboStreak: number): ScoreResult {
  const base = 12 + wordLength * 7;
  const levelFactor = 1 + Math.max(0, level - 1) * 0.11;
  const combo = comboMultiplier(comboStreak);

  return {
    points: roundToInt(base * levelFactor * combo),
    comboMultiplier: combo,
  };
}
