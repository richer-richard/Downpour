import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { NeonButton } from '../NeonButton';

describe('NeonButton', () => {
  it('renders children text', () => {
    render(<NeonButton>Start</NeonButton>);
    expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument();
  });

  it('fires onClick when clicked', async () => {
    const onClick = vi.fn();
    render(<NeonButton onClick={onClick}>Click Me</NeonButton>);

    await userEvent.click(screen.getByRole('button', { name: 'Click Me' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('respects the disabled prop', async () => {
    const onClick = vi.fn();
    render(<NeonButton disabled onClick={onClick}>Disabled</NeonButton>);

    const button = screen.getByRole('button', { name: 'Disabled' });
    expect(button).toBeDisabled();

    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });
});
