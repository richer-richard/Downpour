import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { StartScreen } from '../screens/StartScreen';

describe('StartScreen', () => {
  const defaults = {
    bestWpm: 72.5,
    onStart: vi.fn(),
    onOpenRecords: vi.fn(),
    onOpenSettings: vi.fn(),
  };

  it('renders the best WPM', () => {
    render(<StartScreen {...defaults} />);
    expect(screen.getByText(/Best WPM: 72\.5/)).toBeInTheDocument();
  });

  it('renders Start, Records, and Settings buttons', () => {
    render(<StartScreen {...defaults} />);
    expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Records' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument();
  });

  it('fires onStart when Start is clicked', async () => {
    const onStart = vi.fn();
    render(<StartScreen {...defaults} onStart={onStart} />);

    await userEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(onStart).toHaveBeenCalledOnce();
  });

  it('fires onOpenRecords when Records is clicked', async () => {
    const onOpenRecords = vi.fn();
    render(<StartScreen {...defaults} onOpenRecords={onOpenRecords} />);

    await userEvent.click(screen.getByRole('button', { name: 'Records' }));
    expect(onOpenRecords).toHaveBeenCalledOnce();
  });

  it('fires onOpenSettings when Settings is clicked', async () => {
    const onOpenSettings = vi.fn();
    render(<StartScreen {...defaults} onOpenSettings={onOpenSettings} />);

    await userEvent.click(screen.getByRole('button', { name: 'Settings' }));
    expect(onOpenSettings).toHaveBeenCalledOnce();
  });
});
