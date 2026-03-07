import { describe, expect, it } from 'vitest';
import { pickTargetWord } from '../targeting';

describe('pickTargetWord', () => {
  it('chooses closest to ground first', () => {
    const target = pickTargetWord(
      [
        { id: 'a', text: 'rain', y: 0.3, spawnTick: 1, typedCount: 0 },
        { id: 'b', text: 'rapid', y: 0.6, spawnTick: 2, typedCount: 0 },
      ],
      '',
      'r',
    );

    expect(target?.id).toBe('b');
  });

  it('breaks ties by oldest spawn tick', () => {
    const target = pickTargetWord(
      [
        { id: 'a', text: 'storm', y: 0.5, spawnTick: 2, typedCount: 0 },
        { id: 'b', text: 'stone', y: 0.5, spawnTick: 1, typedCount: 0 },
      ],
      '',
      's',
    );

    expect(target?.id).toBe('b');
  });
});
