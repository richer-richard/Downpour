import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LearnScreen } from '../screens/LearnScreen';
import type { LessonProgress } from '@downpour/shared';

function makeProgress(entries: Partial<LessonProgress>[]): Record<string, LessonProgress> {
  const map: Record<string, LessonProgress> = {};
  for (const partial of entries) {
    const entry: LessonProgress = {
      lessonId: partial.lessonId ?? '',
      completed: partial.completed ?? false,
      stars: partial.stars ?? 0,
      bestWpm: partial.bestWpm ?? 0,
      bestAccuracy: partial.bestAccuracy ?? 0,
      updatedAt: partial.updatedAt ?? '2026-04-12T00:00:00.000Z',
    };
    map[entry.lessonId] = entry;
  }
  return map;
}

describe('LearnScreen', () => {
  it('renders the Home Row unit heading and first lesson', () => {
    render(<LearnScreen progress={{}} onSelectLesson={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByText(/Home Row/i)).toBeInTheDocument();
    expect(screen.getByText(/Key: F/)).toBeInTheDocument();
  });

  it('disables lessons whose prerequisite is not completed', () => {
    render(<LearnScreen progress={{}} onSelectLesson={vi.fn()} onBack={vi.fn()} />);
    // Lesson 2 "Key: J" requires lesson 1; button should be disabled
    const jButton = screen.getByRole('button', { name: /Key: J/ });
    expect(jButton).toBeDisabled();
  });

  it('unlocks the next lesson once the prerequisite is completed', () => {
    const progress = makeProgress([
      { lessonId: 'home-row.01.intro-f', completed: true, stars: 3 },
    ]);
    render(<LearnScreen progress={progress} onSelectLesson={vi.fn()} onBack={vi.fn()} />);
    const jButton = screen.getByRole('button', { name: /Key: J/ });
    expect(jButton).not.toBeDisabled();
  });

  it('fires onSelectLesson with the lesson id when clicked', async () => {
    const onSelectLesson = vi.fn();
    render(<LearnScreen progress={{}} onSelectLesson={onSelectLesson} onBack={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /Key: F/ }));
    expect(onSelectLesson).toHaveBeenCalledWith('home-row.01.intro-f');
  });

  it('fires onBack when Back is clicked', async () => {
    const onBack = vi.fn();
    render(<LearnScreen progress={{}} onSelectLesson={vi.fn()} onBack={onBack} />);
    await userEvent.click(screen.getByRole('button', { name: /Back/ }));
    expect(onBack).toHaveBeenCalledOnce();
  });
});
