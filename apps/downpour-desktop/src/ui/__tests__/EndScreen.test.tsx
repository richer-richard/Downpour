import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EndScreen } from '../screens/EndScreen';
import type { SessionEndSummary } from '../../game/gameController';

const summary: SessionEndSummary = {
  durationSeconds: 93,
  score: 1200,
  accuracy: 0.87,
  sessionBestWpm: 65.3,
  averageWpm: 52.1,
  levelReached: 5,
  mistakes: 8,
  misses: 3,
  mode: 'medium',
};

describe('EndScreen', () => {
  const defaults = {
    summary,
    saveStatus: 'saved' as const,
    onRestart: vi.fn(),
    onOpenRecords: vi.fn(),
    onBackToStart: vi.fn(),
  };

  it('renders all summary fields', () => {
    render(<EndScreen {...defaults} />);

    expect(screen.getByText(/Score: 1200/)).toBeInTheDocument();
    expect(screen.getByText(/Level Reached: 5/)).toBeInTheDocument();
    expect(screen.getByText(/Session Best WPM: 65\.3/)).toBeInTheDocument();
    expect(screen.getByText(/Average WPM: 52\.1/)).toBeInTheDocument();
    expect(screen.getByText(/87\.0%/)).toBeInTheDocument();
    expect(screen.getByText(/1:33/)).toBeInTheDocument();
    expect(screen.getByText(/Mistakes: 8/)).toBeInTheDocument();
    expect(screen.getByText(/Misses: 3/)).toBeInTheDocument();
  });

  it('shows save status text', () => {
    render(<EndScreen {...defaults} saveStatus="saving" />);
    expect(screen.getByText(/saving/i)).toBeInTheDocument();
  });

  it('shows Pending for idle status', () => {
    render(<EndScreen {...defaults} saveStatus="idle" />);
    expect(screen.getByText(/Pending/i)).toBeInTheDocument();
  });

  it('fires onRestart when Restart is clicked', async () => {
    const onRestart = vi.fn();
    render(<EndScreen {...defaults} onRestart={onRestart} />);

    await userEvent.click(screen.getByRole('button', { name: 'Restart' }));
    expect(onRestart).toHaveBeenCalledOnce();
  });

  it('fires onOpenRecords when Records is clicked', async () => {
    const onOpenRecords = vi.fn();
    render(<EndScreen {...defaults} onOpenRecords={onOpenRecords} />);

    await userEvent.click(screen.getByRole('button', { name: 'Records' }));
    expect(onOpenRecords).toHaveBeenCalledOnce();
  });

  it('fires onBackToStart when Home is clicked', async () => {
    const onBackToStart = vi.fn();
    render(<EndScreen {...defaults} onBackToStart={onBackToStart} />);

    await userEvent.click(screen.getByRole('button', { name: 'Home' }));
    expect(onBackToStart).toHaveBeenCalledOnce();
  });
});
