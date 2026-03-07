interface RainDrop {
  x: number;
  y: number;
  speed: number;
  length: number;
  heavy: boolean;
}

export class RainSystem {
  private readonly drops: RainDrop[] = [];

  private width: number;

  private height: number;

  constructor(width: number, height: number, quality: 'high' | 'low') {
    this.width = width;
    this.height = height;
    this.resetDrops(quality);
  }

  public resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  public resetDrops(quality: 'high' | 'low'): void {
    const count = quality === 'high' ? 560 : 300;
    this.drops.length = 0;
    for (let i = 0; i < count; i += 1) {
      this.drops.push(this.createDrop(Math.random() * this.width, Math.random() * this.height, quality));
    }
  }

  public updateAndRender(
    ctx: CanvasRenderingContext2D,
    dtSeconds: number,
    wind: number,
    quality: 'high' | 'low',
    reducedMotion: boolean,
  ): void {
    const sway = reducedMotion ? 0 : wind * (quality === 'high' ? 120 : 80);
    ctx.lineCap = 'round';

    for (const drop of this.drops) {
      drop.y += drop.speed * dtSeconds;
      drop.x += sway * dtSeconds;

      if (drop.y > this.height + drop.length || drop.x < -50 || drop.x > this.width + 50) {
        Object.assign(drop, this.createDrop(Math.random() * this.width, -20 - Math.random() * this.height * 0.3, quality));
      }

      ctx.strokeStyle = drop.heavy
        ? 'rgba(191, 240, 255, 0.75)'
        : 'rgba(171, 225, 255, 0.38)';
      ctx.lineWidth = drop.heavy ? 1.6 : 1;
      ctx.beginPath();
      ctx.moveTo(drop.x, drop.y);
      ctx.lineTo(drop.x + sway * 0.02, drop.y + drop.length);
      ctx.stroke();
    }
  }

  private createDrop(x: number, y: number, quality: 'high' | 'low'): RainDrop {
    const heavy = quality === 'high' && Math.random() > 0.93;
    return {
      x,
      y,
      speed: (heavy ? 820 : 620) + Math.random() * 260,
      length: (heavy ? 22 : 12) + Math.random() * 12,
      heavy,
    };
  }
}
