import type { ImpactEvent, RenderWord } from './types';

interface DissipatingGlyph {
  glyph: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  lifetime: number;
  rotation: number;
  rotationVelocity: number;
  size: number;
  glow: number;
  trailLength: number;
  fillColor: string;
  glowColor: string;
  trailColor: string;
}

export class WordRenderer {
  private previousWords = new Map<string, RenderWord>();

  private dissipatingGlyphs: DissipatingGlyph[] = [];

  public render(
    ctx: CanvasRenderingContext2D,
    words: RenderWord[],
    impacts: ImpactEvent[],
    width: number,
    height: number,
    frameSeconds: number,
    reducedMotion: boolean,
  ): void {
    ctx.clearRect(0, 0, width, height);
    ctx.textBaseline = 'middle';
    ctx.font = '600 30px Orbitron, sans-serif';

    this.spawnWordBursts(ctx, words, impacts, width, height, reducedMotion);
    this.updateDissipatingGlyphs(frameSeconds, reducedMotion);

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

    this.renderDissipatingGlyphs(ctx, reducedMotion);
    this.previousWords = new Map(words.map((word) => [word.id, { ...word }]));
  }

  private spawnWordBursts(
    ctx: CanvasRenderingContext2D,
    words: RenderWord[],
    impacts: ImpactEvent[],
    width: number,
    height: number,
    reducedMotion: boolean,
  ): void {
    const activeWordIds = new Set(words.map((word) => word.id));
    const clearedWords = [...this.previousWords.values()].filter((word) => !activeWordIds.has(word.id));
    const usedWordIds = new Set<string>();

    for (const impact of impacts) {
      if (impact.type !== 'clear' && impact.type !== 'miss') {
        continue;
      }

      const impactX = impact.x * width;
      const impactY = impact.y * height;

      let matchedWord: RenderWord | null = null;
      let nearestDistance = Number.POSITIVE_INFINITY;

      for (const word of clearedWords) {
        if (usedWordIds.has(word.id)) {
          continue;
        }

        const dx = word.x * width - impactX;
        const dy = word.y * height - impactY;
        const distance = Math.hypot(dx, dy);
        const matchThreshold = impact.type === 'miss' ? 52 : 40;
        if (distance < nearestDistance && distance <= matchThreshold) {
          nearestDistance = distance;
          matchedWord = word;
        }
      }

      if (!matchedWord) {
        continue;
      }

      usedWordIds.add(matchedWord.id);
      this.createDissipation(ctx, matchedWord, impact, width, height, reducedMotion);
    }
  }

  private createDissipation(
    ctx: CanvasRenderingContext2D,
    word: RenderWord,
    impact: ImpactEvent,
    width: number,
    height: number,
    reducedMotion: boolean,
  ): void {
    const centerX = word.x * width;
    const centerY = (impact.type === 'miss' ? impact.y : word.y) * height;
    const totalWidth = ctx.measureText(word.text).width;
    let cursorX = centerX - totalWidth / 2;
    const isMiss = impact.type === 'miss';
    const burstScale = reducedMotion
      ? isMiss
        ? 0.72
        : 0.58
      : isMiss
        ? 1.45
        : 1.1;
    const fillColor = isMiss ? '#ffb1a8' : '#f2ffff';
    const glowColor = isMiss ? 'rgba(255, 98, 86,' : 'rgba(118, 244, 255,';
    const trailColor = isMiss ? 'rgba(255, 125, 112,' : 'rgba(118, 244, 255,';

    for (const glyph of word.text) {
      const glyphWidth = ctx.measureText(glyph).width;
      const glyphCenterX = cursorX + glyphWidth / 2;
      const spread = totalWidth > 0 ? (glyphCenterX - centerX) / totalWidth : 0;
      const angle = -Math.PI / 2 + spread * 1.8 + (Math.random() - 0.5) * (isMiss ? 1.3 : 1.05);
      const speed = (88 + Math.random() * 58 + Math.abs(spread) * 36) * burstScale;
      const driftScale = reducedMotion ? 0.6 : 1;

      this.dissipatingGlyphs.push({
        glyph,
        x: glyphCenterX + (Math.random() - 0.5) * 4 * burstScale,
        y: centerY + (Math.random() - 0.5) * 3 * burstScale,
        vx: (Math.cos(angle) * speed + spread * 96 + (Math.random() - 0.5) * 24) * driftScale,
        vy:
          (Math.sin(angle) * speed - (isMiss ? 6 : 18) - Math.random() * (isMiss ? 10 : 18)) * driftScale,
        age: 0,
        lifetime: reducedMotion ? 0.22 + Math.random() * 0.06 : 0.34 + Math.random() * 0.18,
        rotation: (Math.random() - 0.5) * 0.35,
        rotationVelocity: (Math.random() - 0.5) * (reducedMotion ? 1.8 : isMiss ? 5.6 : 4.4),
        size: reducedMotion ? 24 : 28 + Math.random() * 7,
        glow: reducedMotion ? 4 : isMiss ? 12 + Math.random() * 12 : 9 + Math.random() * 10,
        trailLength: reducedMotion ? 0 : isMiss ? 14 + Math.random() * 20 : 10 + Math.random() * 16,
        fillColor,
        glowColor,
        trailColor,
      });

      cursorX += glyphWidth;
    }
  }

  private updateDissipatingGlyphs(frameSeconds: number, reducedMotion: boolean): void {
    const dt = Math.min(frameSeconds, 0.05);
    if (dt <= 0 || this.dissipatingGlyphs.length === 0) {
      return;
    }

    this.dissipatingGlyphs = this.dissipatingGlyphs.filter((glyph) => {
      glyph.age += dt;
      if (glyph.age >= glyph.lifetime) {
        return false;
      }

      glyph.x += glyph.vx * dt;
      glyph.y += glyph.vy * dt;
      glyph.vx *= reducedMotion ? 0.9 : 0.94;
      glyph.vy += (reducedMotion ? 34 : 72) * dt;
      glyph.rotation += glyph.rotationVelocity * dt;

      return true;
    });
  }

  private renderDissipatingGlyphs(ctx: CanvasRenderingContext2D, reducedMotion: boolean): void {
    for (const glyph of this.dissipatingGlyphs) {
      const progress = glyph.age / glyph.lifetime;
      const alpha = 1 - progress;
      const scaledSize = glyph.size * (1 - progress * 0.12);
      const velocityMagnitude = Math.hypot(glyph.vx, glyph.vy) || 1;

      ctx.save();
      ctx.translate(glyph.x, glyph.y);
      ctx.rotate(glyph.rotation);

      if (!reducedMotion && glyph.trailLength > 0) {
        ctx.beginPath();
        ctx.strokeStyle = `${glyph.trailColor}${0.34 * alpha})`;
        ctx.lineWidth = 1.15;
        ctx.moveTo(0, 0);
        ctx.lineTo(
          (-glyph.vx / velocityMagnitude) * glyph.trailLength * alpha,
          (-glyph.vy / velocityMagnitude) * glyph.trailLength * alpha,
        );
        ctx.stroke();
      }

      ctx.font = `600 ${scaledSize}px Orbitron, sans-serif`;
      ctx.shadowColor = `${glyph.glowColor}${0.92 * alpha})`;
      ctx.shadowBlur = glyph.glow * alpha;
      ctx.fillStyle = glyph.fillColor;
      ctx.globalAlpha = 0.94 * alpha;
      ctx.fillText(glyph.glyph, -ctx.measureText(glyph.glyph).width / 2, 0);
      ctx.restore();
    }

    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }
}
