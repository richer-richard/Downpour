import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LessonScreen } from '../screens/LessonScreen';
import type { Lesson } from '../../learn/lessons';

function introLesson(): Lesson {
  return {
    id: 'test.intro',
    unit: 'Test',
    order: 1,
    title: 'Key: F',
    summary: 'test',
    steps: [
      {
        kind: 'intro_key',
        key: 'f',
        finger: 'L_INDEX',
        description: 'Press F',
      },
    ],
  };
}

describe('LessonScreen', () => {
  it('advances past an intro step when the correct key is pressed', async () => {
    const onComplete = vi.fn();
    render(<LessonScreen lesson={introLesson()} onBack={vi.fn()} onComplete={onComplete} />);

    expect(screen.getByText(/left index finger/i)).toBeInTheDocument();

    await userEvent.keyboard('f');

    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({ lessonId: 'test.intro', stars: 3 }),
    );
  });

  it('does not advance on the wrong key', async () => {
    const onComplete = vi.fn();
    render(<LessonScreen lesson={introLesson()} onBack={vi.fn()} onComplete={onComplete} />);

    await userEvent.keyboard('g');
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('fires onBack when Back is clicked', async () => {
    const onBack = vi.fn();
    render(<LessonScreen lesson={introLesson()} onBack={onBack} onComplete={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /Back/ }));
    expect(onBack).toHaveBeenCalledOnce();
  });
});
