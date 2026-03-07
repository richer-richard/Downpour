import type { GraphicsQuality } from '@downpour/shared';

export interface PerformanceProfileOptions {
  initialQuality: GraphicsQuality;
}

export class PerformanceProfile {
  private quality: GraphicsQuality;

  private slowFrameWindowMs = 0;

  private readonly thresholdMs = 20;

  constructor(options: PerformanceProfileOptions) {
    this.quality = options.initialQuality;
  }

  public sampleFrame(frameMs: number): GraphicsQuality {
    if (this.quality === 'low') {
      return this.quality;
    }

    if (frameMs > this.thresholdMs) {
      this.slowFrameWindowMs += frameMs;
    } else {
      this.slowFrameWindowMs = Math.max(0, this.slowFrameWindowMs - frameMs * 0.5);
    }

    if (this.slowFrameWindowMs >= 3000) {
      this.quality = 'low';
    }

    return this.quality;
  }

  public setQuality(quality: GraphicsQuality): void {
    this.quality = quality;
    this.slowFrameWindowMs = 0;
  }

  public getQuality(): GraphicsQuality {
    return this.quality;
  }
}
