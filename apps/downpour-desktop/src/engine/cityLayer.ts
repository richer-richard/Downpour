interface LayerOptions {
  width: number;
  height: number;
}

export class CityLayer {
  private cacheCanvas: HTMLCanvasElement;

  private cacheCtx: CanvasRenderingContext2D;

  private width: number;

  private height: number;

  constructor(options: LayerOptions) {
    this.width = options.width;
    this.height = options.height;
    this.cacheCanvas = document.createElement('canvas');
    this.cacheCanvas.width = this.width;
    this.cacheCanvas.height = this.height;
    this.cacheCtx = this.cacheCanvas.getContext('2d') as CanvasRenderingContext2D;
    this.rebuild();
  }

  public resize(width: number, height: number): void {
    if (width === this.width && height === this.height) {
      return;
    }

    this.width = width;
    this.height = height;
    this.cacheCanvas.width = width;
    this.cacheCanvas.height = height;
    this.rebuild();
  }

  public render(ctx: CanvasRenderingContext2D, elapsedSeconds: number, wind: number, groundLine: number): void {
    const shift = Math.sin(elapsedSeconds * 0.05) * 10 + wind * 12;
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.drawImage(this.cacheCanvas, shift, 0);
    ctx.drawImage(this.cacheCanvas, shift - this.width, 0);

    const haze = ctx.createLinearGradient(0, 0, 0, this.height);
    haze.addColorStop(0, 'rgba(16, 50, 86, 0.35)');
    haze.addColorStop(0.55, 'rgba(9, 20, 32, 0.2)');
    haze.addColorStop(1, 'rgba(5, 9, 14, 0.75)');
    ctx.fillStyle = haze;
    ctx.fillRect(0, 0, this.width, this.height);

    const reflectionTop = Math.max(0, Math.min(this.height, this.height * groundLine));
    const reflectionHeight = this.height - reflectionTop;

    const reflectGradient = ctx.createLinearGradient(0, reflectionTop, 0, this.height);
    reflectGradient.addColorStop(0, 'rgba(91, 204, 255, 0.08)');
    reflectGradient.addColorStop(1, 'rgba(4, 14, 24, 0.55)');
    ctx.fillStyle = reflectGradient;
    ctx.fillRect(0, reflectionTop, this.width, reflectionHeight);
  }

  private rebuild(): void {
    const ctx = this.cacheCtx;
    ctx.clearRect(0, 0, this.width, this.height);

    const sky = ctx.createLinearGradient(0, 0, 0, this.height);
    sky.addColorStop(0, '#01040c');
    sky.addColorStop(0.55, '#041427');
    sky.addColorStop(1, '#051a2f');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, this.width, this.height);

    this.drawSkyline(ctx, 0.25, '#112742', 0.18, 0.5);
    this.drawSkyline(ctx, 0.4, '#173356', 0.25, 0.75);
    this.drawSkyline(ctx, 0.56, '#1f486f', 0.32, 1);

    const glow = ctx.createRadialGradient(
      this.width * 0.52,
      this.height * 0.82,
      10,
      this.width * 0.52,
      this.height * 0.82,
      this.width * 0.45,
    );
    glow.addColorStop(0, 'rgba(255, 170, 80, 0.24)');
    glow.addColorStop(1, 'rgba(255, 170, 80, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, this.height * 0.45, this.width, this.height * 0.6);
  }

  private drawSkyline(
    ctx: CanvasRenderingContext2D,
    startYRatio: number,
    color: string,
    minHeightRatio: number,
    maxHeightRatio: number,
  ): void {
    const horizon = this.height * startYRatio;
    const minHeight = this.height * minHeightRatio;
    const maxHeight = this.height * maxHeightRatio;

    ctx.fillStyle = color;
    let x = 0;

    while (x < this.width + 40) {
      const width = 24 + Math.random() * 58;
      const height = minHeight + Math.random() * (maxHeight - minHeight);
      ctx.fillRect(x, horizon - height, width, height);

      if (Math.random() > 0.5) {
        ctx.fillStyle = 'rgba(136, 218, 255, 0.16)';
        for (let row = 0; row < height - 20; row += 12) {
          for (let col = 5; col < width - 5; col += 10) {
            if (Math.random() > 0.62) {
              ctx.fillRect(x + col, horizon - row - 8, 4, 6);
            }
          }
        }
        ctx.fillStyle = color;
      }

      x += width + 6;
    }
  }
}
