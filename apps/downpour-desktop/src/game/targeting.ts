export interface TargetableWord {
  id: string;
  text: string;
  y: number;
  spawnTick: number;
  typedCount: number;
}

export function pickTargetWord(
  words: TargetableWord[],
  currentBuffer: string,
  nextChar: string,
): TargetableWord | null {
  const proposal = (currentBuffer + nextChar).toLowerCase();

  const candidates = words.filter((word) => {
    const typedPrefix = word.text.slice(0, word.typedCount);
    return typedPrefix === currentBuffer && word.text.toLowerCase().startsWith(proposal);
  });

  if (candidates.length === 0) {
    return null;
  }

  candidates.sort((a, b) => {
    if (b.y !== a.y) {
      return b.y - a.y;
    }
    return a.spawnTick - b.spawnTick;
  });

  return candidates[0] ?? null;
}
