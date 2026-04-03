import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { HudSnapshot } from '@downpour/shared';
import { GameScreen } from '../screens/GameScreen';

const mockHud: HudSnapshot = {
  elapsedSeconds: 12.5,
  level: 3,
  score: 450,
  combo: 5,
  lives: 0,
  waterLevel: 0.25,
  accuracy: 0.92,
  currentWpm: 58.3,
  sessionBestWpm: 62.1,
  globalBestWpm: 80.0,
  isPaused: false,
  isGameOver: false,
};

const mockSession = {
  setBgCanvas: vi.fn(),
  setFxCanvas: vi.fn(),
  setWordCanvas: vi.fn(),
  hud: mockHud,
  paused: false,
  effectiveQuality: 'high' as const,
  togglePause: vi.fn(),
  handlePrintable: vi.fn(),
  handleBackspace: vi.fn(),
  unlockAudio: vi.fn().mockResolvedValue(undefined),
};

vi.mock('../hooks/useGameSession', () => ({
  useGameSession: () => mockSession,
}));

vi.mock('../hooks/useKeyboardInput', () => ({
  useKeyboardInput: () => {},
}));

describe('GameScreen', () => {
  const defaults = {
    settings: {
      reducedMotion: false,
      graphicsQuality: 'high' as const,
      difficulty: 'medium' as const,
      soundEnabled: true,
    },
    globalBestWpm: 80.0,
    onRunEnd: vi.fn(),
    onBackToStart: vi.fn(),
  };

  it('renders the HUD overlay with score and level', () => {
    render(<GameScreen {...defaults} />);

    expect(screen.getByText(/Score: 450/)).toBeInTheDocument();
    expect(screen.getByText(/Level: 3/)).toBeInTheDocument();
  });

  it('renders three canvas elements', () => {
    render(<GameScreen {...defaults} />);
    const canvases = document.querySelectorAll('canvas');
    expect(canvases).toHaveLength(3);
  });

  it('renders Exit button that fires onBackToStart', async () => {
    const onBackToStart = vi.fn();
    render(<GameScreen {...defaults} onBackToStart={onBackToStart} />);

    await userEvent.click(screen.getByRole('button', { name: 'Exit' }));
    expect(onBackToStart).toHaveBeenCalledOnce();
  });

  it('shows pause overlay when paused', () => {
    mockSession.paused = true;
    render(<GameScreen {...defaults} />);

    expect(screen.getByText('Paused')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Resume' })).toBeInTheDocument();

    mockSession.paused = false;
  });

  it('does not show pause overlay when not paused', () => {
    mockSession.paused = false;
    render(<GameScreen {...defaults} />);

    expect(screen.queryByText('Paused')).not.toBeInTheDocument();
  });
});
