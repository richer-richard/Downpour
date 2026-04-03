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

    const toggle = screen.getByRole('switch', { name: 'Sound' });
    await userEvent.click(toggle);

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ soundEnabled: false }));
  });

  it('toggles reduced motion', async () => {
    const onChange = vi.fn();
    render(<SettingsScreen settings={baseSettings} onChange={onChange} onBack={vi.fn()} />);

    const toggle = screen.getByRole('switch', { name: 'Reduced Motion' });
    await userEvent.click(toggle);

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ reducedMotion: true }));
  });

  it('changes graphics quality via custom dropdown', async () => {
    const onChange = vi.fn();
    render(<SettingsScreen settings={baseSettings} onChange={onChange} onBack={vi.fn()} />);

    // Open the dropdown
    const trigger = screen.getByRole('button', { name: 'Graphics Quality' });
    await userEvent.click(trigger);

    // Select the option from the listbox
    const option = screen.getByRole('option', { name: 'Low' });
    await userEvent.click(option);

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ graphicsQuality: 'low' }));
  });

  it('changes difficulty via custom dropdown', async () => {
    const onChange = vi.fn();
    render(<SettingsScreen settings={baseSettings} onChange={onChange} onBack={vi.fn()} />);

    const trigger = screen.getByRole('button', { name: 'Difficulty' });
    await userEvent.click(trigger);

    const option = screen.getByRole('option', { name: 'Hard' });
    await userEvent.click(option);

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ difficulty: 'hard' }));
  });

  it('closes dropdown when clicking outside', async () => {
    render(<SettingsScreen settings={baseSettings} onChange={vi.fn()} onBack={vi.fn()} />);

    const trigger = screen.getByRole('button', { name: 'Graphics Quality' });
    await userEvent.click(trigger);
    expect(screen.getByRole('listbox', { name: 'Graphics Quality' })).toBeInTheDocument();

    // Click outside
    await userEvent.click(document.body);
    expect(screen.queryByRole('listbox', { name: 'Graphics Quality' })).not.toBeInTheDocument();
  });

  it('fires onBack when Back is clicked', async () => {
    const onBack = vi.fn();
    render(<SettingsScreen settings={baseSettings} onChange={vi.fn()} onBack={onBack} />);

    await userEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(onBack).toHaveBeenCalledOnce();
  });
});
