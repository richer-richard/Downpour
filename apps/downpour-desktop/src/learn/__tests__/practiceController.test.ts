import { describe, expect, it } from 'vitest';
import { PracticeController } from '../practiceController';

function makeClock(start = 0) {
  let now = start;
  return {
    now: () => now,
    advance(ms: number) {
      now += ms;
    },
  };
}

describe('PracticeController', () => {
  it('throws on empty pool', () => {
    expect(() => new PracticeController({ pool: [] })).toThrow();
  });

  it('counts correct keystrokes and mistakes against the current word', () => {
    const clock = makeClock();
    const ctrl = new PracticeController({
      pool: ['fad'],
      durationSeconds: 60,
      now: clock.now,
      random: () => 0,
    });

    ctrl.handlePrintable('f');
    clock.advance(100);
    ctrl.handlePrintable('x'); // wrong
    clock.advance(100);
    ctrl.handlePrintable('a');
    clock.advance(100);
    ctrl.handlePrintable('d');

    const stats = ctrl.stats();
    expect(stats.correctChars).toBe(3);
    expect(stats.mistakes).toBe(1);
    expect(stats.totalTyped).toBe(4);
    expect(stats.accuracy).toBeCloseTo(3 / 4, 5);
  });

  it('advances to the next word on space after a correct word', () => {
    const ctrl = new PracticeController({
      pool: ['fad', 'jak'],
      durationSeconds: 60,
      now: () => 0,
      random: () => 0.9, // pick last word first
    });
    // initial word is pool[floor(0.9*2)]=pool[1]='jak'
    expect(ctrl.state().currentWord).toBe('jak');
    ctrl.handlePrintable('j');
    ctrl.handlePrintable('a');
    ctrl.handlePrintable('k');
    ctrl.handlePrintable(' ');
    expect(ctrl.state().completedWords).toBe(1);
    expect(ctrl.state().typed).toBe('');
  });

  it('ends session when duration elapses', () => {
    const clock = makeClock();
    const ctrl = new PracticeController({
      pool: ['f'],
      durationSeconds: 1,
      now: clock.now,
    });
    ctrl.handlePrintable('f');
    clock.advance(1500);
    ctrl.tick();
    expect(ctrl.state().finished).toBe(true);
  });

  it('handleBackspace removes the last typed char within the current word', () => {
    const ctrl = new PracticeController({ pool: ['fad'], durationSeconds: 60 });
    ctrl.handlePrintable('f');
    ctrl.handlePrintable('a');
    ctrl.handleBackspace();
    expect(ctrl.state().typed).toBe('f');
  });
});
