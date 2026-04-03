import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { GameSettings } from '@downpour/shared';
import { SettingsScreen } from '../screens/SettingsScreen';

const baseSettings: GameSettings = {
  reducedMotion: false,
  graphicsQuality: 'high',
  difficulty: 'medium',
  soundEnabled: true,
};

describe('SettingsScreen', () => {
  it('renders all setting controls', () => {
    render(<SettingsScreen settings={baseSettings} onChange={vi.fn()} onBack={vi.fn()} />);

    expect(screen.getByText('Sound')).toBeInTheDocument();
    expect(screen.getByText('Reduced Motion')).toBeInTheDocument();
    expect(screen.getByText('Graphics Quality')).toBeInTheDocument();
    expect(screen.getByText('Difficulty')).toBeInTheDocument();
  });

  it('toggles sound enabled', async () => {
    const onChange = vi.fn();
    render(<SettingsScreen settings={baseSettings} onChange={onChange} onBack={vi.fn()} />);

    const checkbox = screen.getByRole('checkbox', { name: 'Sound' });
    await userEvent.click(checkbox);

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ soundEnabled: false }));
  });

  it('toggles reduced motion', async () => {
    const onChange = vi.fn();
    render(<SettingsScreen settings={baseSettings} onChange={onChange} onBack={vi.fn()} />);

    const checkbox = screen.getByRole('checkbox', { name: 'Reduced Motion' });
    await userEvent.click(checkbox);

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ reducedMotion: true }));
  });

  it('changes graphics quality', async () => {
    const onChange = vi.fn();
    render(<SettingsScreen settings={baseSettings} onChange={onChange} onBack={vi.fn()} />);

    const select = screen.getByRole('combobox', { name: 'Graphics Quality' });
    await userEvent.selectOptions(select, 'low');

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ graphicsQuality: 'low' }));
  });

  it('changes difficulty', async () => {
    const onChange = vi.fn();
    render(<SettingsScreen settings={baseSettings} onChange={onChange} onBack={vi.fn()} />);

    const select = screen.getByRole('combobox', { name: 'Difficulty' });
    await userEvent.selectOptions(select, 'hard');

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ difficulty: 'hard' }));
  });

  it('fires onBack when Back is clicked', async () => {
    const onBack = vi.fn();
    render(<SettingsScreen settings={baseSettings} onChange={vi.fn()} onBack={onBack} />);

    await userEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(onBack).toHaveBeenCalledOnce();
  });
});
