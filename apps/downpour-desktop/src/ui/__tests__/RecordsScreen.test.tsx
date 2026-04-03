import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { GameRecord } from '@downpour/shared';
import { RecordsScreen } from '../screens/RecordsScreen';

const sampleRecords: GameRecord[] = [
  {
    id: 'a',
    timestampIso: '2026-01-15T10:00:00.000Z',
    durationSeconds: 60,
    score: 500,
    accuracy: 0.9,
    sessionBestWpm: 55,
    averageWpm: 48,
    levelReached: 4,
    mistakes: 3,
    misses: 1,
    mode: 'medium',
  },
  {
    id: 'b',
    timestampIso: '2026-02-01T12:00:00.000Z',
    durationSeconds: 120,
    score: 1200,
    accuracy: 0.95,
    sessionBestWpm: 70,
    averageWpm: 62,
    levelReached: 7,
    mistakes: 2,
    misses: 0,
    mode: 'hard',
  },
];

describe('RecordsScreen', () => {
  const defaults = {
    records: sampleRecords,
    loading: false,
    onRefresh: vi.fn().mockResolvedValue(undefined),
    onReset: vi.fn().mockResolvedValue(undefined),
    onBack: vi.fn(),
  };

  it('shows empty message when no records', () => {
    render(<RecordsScreen {...defaults} records={[]} />);
    expect(screen.getByText('No runs saved yet.')).toBeInTheDocument();
  });

  it('renders table rows for records', () => {
    render(<RecordsScreen {...defaults} />);
    expect(screen.getByText('500')).toBeInTheDocument();
    expect(screen.getByText('1200')).toBeInTheDocument();
  });

  it('shows loading text when loading', () => {
    render(<RecordsScreen {...defaults} loading={true} />);
    expect(screen.getByText('Loading records...')).toBeInTheDocument();
  });

  it('fires onBack when Back is clicked', async () => {
    const onBack = vi.fn();
    render(<RecordsScreen {...defaults} onBack={onBack} />);

    await userEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it('shows reset confirmation when Reset is clicked', async () => {
    render(<RecordsScreen {...defaults} />);

    await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(screen.getByText(/Delete all saved records/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm Reset' })).toBeInTheDocument();
  });

  it('fires onReset when reset is confirmed', async () => {
    const onReset = vi.fn().mockResolvedValue(undefined);
    render(<RecordsScreen {...defaults} onReset={onReset} />);

    await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirm Reset' }));
    expect(onReset).toHaveBeenCalledOnce();
  });

  it('cancels reset when Cancel is clicked', async () => {
    const onReset = vi.fn();
    render(<RecordsScreen {...defaults} onReset={onReset} />);

    await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onReset).not.toHaveBeenCalled();
    expect(screen.queryByText(/Delete all saved records/)).not.toBeInTheDocument();
  });

  it('fires onRefresh when Refresh is clicked', async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    render(<RecordsScreen {...defaults} onRefresh={onRefresh} />);

    await userEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(onRefresh).toHaveBeenCalledOnce();
  });
});
