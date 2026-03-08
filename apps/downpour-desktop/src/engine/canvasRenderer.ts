import type { GraphicsQuality } from '@downpour/shared';
import { CityLayer } from './cityLayer';
import { RainSystem } from './rainSystem';
import { RippleField } from './rippleField';
import type { RenderFrame } from './types';
import { WordRenderer } from './wordRenderer';

export interface CanvasRendererOptions {
  bgCanvas: HTMLCanvasElement;
  fxCanvas: HTMLCanvasElement;
  wordCanvas: HTMLCanvasElement;
  quality: GraphicsQuality;
}

export class CanvasRenderer {
  private readonly bgCanvas: HTMLCanvasElement;

  private readonly fxCanvas: HTMLCanvasElement;

  private readonly wordCanvas: HTMLCanvasElement;

  private readonly bgCtx: CanvasRenderingContext2D;

  private readonly fxCtx: CanvasRenderingContext2D;

  private readonly wordCtx: CanvasRenderingContext2D;

  private cityLayer: CityLayer;

  private rainSystem: RainSystem;

  private rippleField: RippleField;

  private wordRenderer: WordRenderer;

  private width = 0;

  private height = 0;

  private pixelWidth = 0;

  private pixelHeight = 0;

  private quality: GraphicsQuality;

  constructor(options: CanvasRendererOptions) {
    this.bgCanvas = options.bgCanvas;
    this.fxCanvas = options.fxCanvas;
    this.wordCanvas = options.wordCanvas;
    this.quality = options.quality;

    this.bgCtx = this.bgCanvas.getContext('2d') as CanvasRenderingContext2D;
    this.fxCtx = this.fxCanvas.getContext('2d') as CanvasRenderingContext2D;
    this.wordCtx = this.wordCanvas.getContext('2d') as CanvasRenderingContext2D;

    this.resizeToDisplaySize();
    this.cityLayer = new CityLayer({ width: this.width, height: this.height });
    this.rainSystem = new RainSystem(this.width, this.height, this.quality);
    this.rippleField = new RippleField();
    this.rippleField.setQuality(this.quality);
    this.wordRenderer = new WordRenderer();

    window.addEventListener('resize', this.resizeToDisplaySize);
  }

  public setQuality(quality: GraphicsQuality): void {
    if (quality === this.quality) {
      return;
    }

    this.quality = quality;
    this.rainSystem.resetDrops(quality);
    this.rippleField.setQuality(quality);
  }

  public getQuality(): GraphicsQuality {
    return this.quality;
  }

  public render(frame: RenderFrame): void {
    this.resizeToDisplaySize();

    this.cityLayer.render(this.bgCtx, frame.snapshot.elapsedSeconds, frame.snapshot.wind, frame.snapshot.groundLine);

    this.fxCtx.clearRect(0, 0, this.width, this.height);

    this.rainSystem.updateAndRender(
      this.fxCtx,
      frame.frameMs / 1000,
      frame.snapshot.wind,
      this.quality,
      frame.quality.reducedMotion,
    );

    this.rippleField.setWaterline(frame.snapshot.groundLine);

    for (const impact of frame.impacts) {
      const radius = impact.type === 'miss' ? 6 : 3;
      this.rippleField.addImpulse(impact.x, impact.strength, radius);

      this.fxCtx.beginPath();
      this.fxCtx.strokeStyle = impact.type === 'miss' ? 'rgba(166, 225, 255, 0.6)' : 'rgba(190, 255, 255, 0.42)';
      this.fxCtx.lineWidth = impact.type === 'miss' ? 1.8 : 1.2;
      this.fxCtx.arc(
        impact.x * this.width,
        impact.y * this.height,
        impact.type === 'miss' ? 12 + impact.strength * 2 : 8,
        0,
        Math.PI * 2,
      );
      this.fxCtx.stroke();
    }

    const simulationSteps = frame.quality.reducedMotion ? 1 : this.quality === 'high' ? 2 : 1;
    this.rippleField.step(simulationSteps);
    this.rippleField.render(this.fxCtx, this.width, this.height);

    this.wordRenderer.render(
      this.wordCtx,
      frame.snapshot.words,
      frame.impacts,
      this.width,
      this.height,
      frame.frameMs / 1000,
      frame.quality.reducedMotion,
    );
  }

  public destroy(): void {
    window.removeEventListener('resize', this.resizeToDisplaySize);
  }

  private readonly resizeToDisplaySize = (): void => {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const logicalWidth = Math.max(1, this.bgCanvas.clientWidth);
    const logicalHeight = Math.max(1, this.bgCanvas.clientHeight);
    const pixelWidth = Math.floor(logicalWidth * dpr);
    const pixelHeight = Math.floor(logicalHeight * dpr);

    if (pixelWidth === this.pixelWidth && pixelHeight === this.pixelHeight) {
      return;
    }

    this.width = logicalWidth;
    this.height = logicalHeight;
    this.pixelWidth = pixelWidth;
    this.pixelHeight = pixelHeight;

    for (const canvas of [this.bgCanvas, this.fxCanvas, this.wordCanvas]) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }

    if (this.bgCtx) {
      this.bgCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.fxCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.wordCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    if (this.cityLayer) {
      this.cityLayer.resize(logicalWidth, logicalHeight);
    }

    if (this.rainSystem) {
      this.rainSystem.resize(logicalWidth, logicalHeight);
      this.rainSystem.resetDrops(this.quality);
    }
  };
}
