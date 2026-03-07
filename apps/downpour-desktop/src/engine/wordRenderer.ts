import type { RenderWord } from './types';

export class WordRenderer {
  public render(
    ctx: CanvasRenderingContext2D,
    words: RenderWord[],
    width: number,
    height: number,
    reducedMotion: boolean,
  ): void {
    ctx.clearRect(0, 0, width, height);
    ctx.textBaseline = 'middle';
    ctx.font = '600 30px Orbitron, sans-serif';

    for (const word of words) {
      const x = word.x * width;
      const y = word.y * height;

      const streakLength = reducedMotion ? 24 : 30 + Math.min(55, word.speed * 140);
      ctx.strokeStyle = 'rgba(110, 226, 255, 0.45)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x, y - 8);
      ctx.lineTo(x, y - streakLength);
      ctx.stroke();

      const typed = word.text.slice(0, word.typedCount);
      const rest = word.text.slice(word.typedCount);

      if (!reducedMotion) {
        ctx.shadowColor = word.mistakeFlash > 0 ? 'rgba(255, 96, 96, 0.8)' : 'rgba(118, 244, 255, 0.95)';
        ctx.shadowBlur = 10;
      } else {
        ctx.shadowBlur = 0;
      }

      const totalWidth = ctx.measureText(word.text).width;
      const startX = x - totalWidth / 2;

      ctx.fillStyle = word.mistakeFlash > 0 ? '#ff8080' : '#89f2ff';
      ctx.fillText(rest, startX + ctx.measureText(typed).width, y);

      ctx.fillStyle = '#f2ffff';
      ctx.fillText(typed, startX, y);

      ctx.shadowBlur = 0;
    }
  }
}
