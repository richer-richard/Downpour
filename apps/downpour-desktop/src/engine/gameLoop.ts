export interface GameLoopOptions {
  fixedStepSeconds: number;
  maxSubSteps?: number;
  update: (dtSeconds: number) => void;
  render: (alpha: number, frameMs: number) => void;
}

export class GameLoop {
  private readonly step: number;

  private readonly maxSubSteps: number;

  private readonly updateFn: (dtSeconds: number) => void;

  private readonly renderFn: (alpha: number, frameMs: number) => void;

  private rafId = 0;

  private running = false;

  private lastTimestamp = 0;

  private accumulator = 0;

  constructor(options: GameLoopOptions) {
    this.step = options.fixedStepSeconds;
    this.maxSubSteps = options.maxSubSteps ?? 5;
    this.updateFn = options.update;
    this.renderFn = options.render;
  }

  public start(): void {
    if (this.running) {
      return;
    }

    this.running = true;
    this.lastTimestamp = performance.now();
    this.accumulator = 0;
    this.rafId = requestAnimationFrame(this.tick);
  }

  public stop(): void {
    if (!this.running) {
      return;
    }

    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  private readonly tick = (timestamp: number): void => {
    if (!this.running) {
      return;
    }

    const frameMs = Math.min(100, timestamp - this.lastTimestamp);
    this.lastTimestamp = timestamp;
    this.accumulator += frameMs / 1000;

    let steps = 0;
    while (this.accumulator >= this.step && steps < this.maxSubSteps) {
      this.updateFn(this.step);
      this.accumulator -= this.step;
      steps += 1;
    }

    const alpha = this.accumulator / this.step;
    this.renderFn(alpha, frameMs);
    this.rafId = requestAnimationFrame(this.tick);
  };
}
