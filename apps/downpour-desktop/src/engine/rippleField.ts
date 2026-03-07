const FIELD_WIDTH = 192;
const FIELD_HEIGHT = 64;

export class RippleField {
  private prev = new Float32Array(FIELD_WIDTH * FIELD_HEIGHT);

  private curr = new Float32Array(FIELD_WIDTH * FIELD_HEIGHT);

  private next = new Float32Array(FIELD_WIDTH * FIELD_HEIGHT);

  private damping = 0.985;

  private waterLevel = 0;

  public setQuality(quality: 'high' | 'low'): void {
    this.damping = quality === 'high' ? 0.985 : 0.97;
  }

  public setWaterLevel(level: number): void {
    this.waterLevel = Math.max(0, Math.min(1, level));
  }

  public addImpulse(normalizedX: number, strength: number, radius: number): void {
    const centerX = Math.floor(normalizedX * (FIELD_WIDTH - 1));
    const centerY = Math.floor((0.22 + this.waterLevel * 0.6) * (FIELD_HEIGHT - 1));

    for (let y = Math.max(1, centerY - radius); y < Math.min(FIELD_HEIGHT - 1, centerY + radius); y += 1) {
      for (let x = Math.max(1, centerX - radius); x < Math.min(FIELD_WIDTH - 1, centerX + radius); x += 1) {
        const dx = x - centerX;
        const dy = y - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= radius) {
          const weight = 1 - dist / radius;
          this.curr[y * FIELD_WIDTH + x] += strength * weight;
        }
      }
    }
  }

  public step(iterations: number): void {
    for (let it = 0; it < iterations; it += 1) {
      for (let y = 1; y < FIELD_HEIGHT - 1; y += 1) {
        for (let x = 1; x < FIELD_WIDTH - 1; x += 1) {
          const i = y * FIELD_WIDTH + x;
          const neighborSum =
            this.curr[i - 1] + this.curr[i + 1] + this.curr[i - FIELD_WIDTH] + this.curr[i + FIELD_WIDTH];
          this.next[i] = (neighborSum / 2 - this.prev[i]) * this.damping;
        }
      }

      const oldPrev = this.prev;
      this.prev = this.curr;
      this.curr = this.next;
      this.next = oldPrev;
    }
  }

  public render(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const baseHeight = Math.floor(height * (0.15 + this.waterLevel * 0.24));
    const waterTop = height - baseHeight;

    const fill = ctx.createLinearGradient(0, waterTop, 0, height);
    fill.addColorStop(0, 'rgba(42, 153, 207, 0.24)');
    fill.addColorStop(1, 'rgba(5, 22, 34, 0.72)');
    ctx.fillStyle = fill;
    ctx.fillRect(0, waterTop, width, baseHeight);

    ctx.strokeStyle = 'rgba(156, 236, 255, 0.55)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();

    const sampleY = Math.floor(FIELD_HEIGHT * (0.2 + this.waterLevel * 0.62));
    for (let x = 0; x < width; x += 2) {
      const fx = Math.floor((x / width) * (FIELD_WIDTH - 1));
      const heightSample = this.curr[sampleY * FIELD_WIDTH + fx] ?? 0;
      const py = waterTop + heightSample * 0.9;
      if (x === 0) {
        ctx.moveTo(x, py);
      } else {
        ctx.lineTo(x, py);
      }
    }

    ctx.stroke();

    ctx.globalAlpha = 0.25;
    ctx.fillStyle = 'rgba(145, 224, 255, 0.28)';
    for (let y = 0; y < 10; y += 1) {
      const rowY = waterTop + y * 8;
      ctx.fillRect(0, rowY, width, 1);
    }
    ctx.globalAlpha = 1;
  }
}
