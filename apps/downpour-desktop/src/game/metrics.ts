export function computeAccuracy(correctChars: number, totalTypedChars: number): number {
  if (totalTypedChars <= 0) {
    return 0;
  }
  return correctChars / totalTypedChars;
}

export function computeWpm(correctChars: number, elapsedSeconds: number): number {
  const minutes = elapsedSeconds / 60;
  if (minutes <= 0) {
    return 0;
  }
  return (correctChars / 5) / minutes;
}
