import type { GameSettings } from '@downpour/shared';
import { describe, expect, it } from 'vitest';
import { GameController } from '../gameController';

const SETTINGS: GameSettings = {
  reducedMotion: false,
  graphicsQuality: 'high',
  difficulty: 'normal',
  soundEnabled: true,
};

function makeController() {
  return new GameController({ settings: SETTINGS, globalBestWpm: 0 });
}

describe('waterline fail state', () => {
  it('moves the active kill line upward with the water level', () => {
    const controller = makeController();
    (controller as any).waterLevel = 0.5;

    expect(controller.getRenderSnapshot().groundLine).toBeCloseTo(0.49, 5);
  });

  it('does not end the run after five misses unless the water reaches the top threshold', () => {
    const controller = makeController();

    for (let index = 0; index < 5; index += 1) {
      const word = {
        id: `word-${index}`,
        text: 'storm',
        x: 0.5,
        y: controller.getRenderSnapshot().groundLine,
        speed: 0.12,
        typedCount: 0,
        spawnTick: index,
        mistakeFlash: 0,
      };

      (controller as any).words = [word];
      (controller as any).handleMiss(word);
    }

    expect(controller.isGameOver()).toBe(false);
    expect(controller.getHudSnapshot().waterLevel).toBeLessThan(1);
  });

  it('removes words when they touch the raised water surface', () => {
    const controller = makeController();
    (controller as any).waterLevel = 0.5;
    (controller as any).targetWaterLevel = 0.5;
    const groundLine = controller.getRenderSnapshot().groundLine;

    (controller as any).words = [
      {
        id: 'word-1',
        text: 'storm',
        x: 0.5,
        y: groundLine + 0.002,
        speed: 0.12,
        typedCount: 0,
        spawnTick: 1,
        mistakeFlash: 0,
      },
    ];

    controller.update(0.016);

    expect((controller as any).words).toHaveLength(0);
    expect(controller.consumeImpacts()[0]?.type).toBe('miss');
  });

  it('raises the waterline smoothly instead of jumping instantly', () => {
    const controller = makeController();
    const word = {
      id: 'word-1',
      text: 'storm',
      x: 0.5,
      y: controller.getRenderSnapshot().groundLine,
      speed: 0.12,
      typedCount: 0,
      spawnTick: 1,
      mistakeFlash: 0,
    };

    (controller as any).words = [word];
    controller.update(0.016);

    const immediateWaterLevel = controller.getHudSnapshot().waterLevel;
    expect(immediateWaterLevel).toBeGreaterThan(0);
    expect(immediateWaterLevel).toBeLessThan(0.04);

    controller.update(0.4);
    expect(controller.getHudSnapshot().waterLevel).toBeGreaterThan(immediateWaterLevel);
  });
});
