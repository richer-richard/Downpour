import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SortHeader } from '../SortHeader';

describe('SortHeader', () => {
  it('renders the label', () => {
    render(
      <SortHeader label="Score" sortKey="score" activeSortKey="date" direction="desc" onToggle={vi.fn()} />,
    );
    expect(screen.getByText('Score')).toBeInTheDocument();
  });

  it('shows descending indicator when active and desc', () => {
    render(
      <SortHeader label="Score" sortKey="score" activeSortKey="score" direction="desc" onToggle={vi.fn()} />,
    );
    expect(screen.getByText('▼')).toBeInTheDocument();
  });

  it('shows ascending indicator when active and asc', () => {
    render(
      <SortHeader label="Score" sortKey="score" activeSortKey="score" direction="asc" onToggle={vi.fn()} />,
    );
    expect(screen.getByText('▲')).toBeInTheDocument();
  });

  it('shows neutral dot when inactive', () => {
    render(
      <SortHeader label="Score" sortKey="score" activeSortKey="date" direction="desc" onToggle={vi.fn()} />,
    );
    expect(screen.getByText('·')).toBeInTheDocument();
  });

  it('fires onToggle with the sort key when clicked', async () => {
    const onToggle = vi.fn();
    render(
      <SortHeader label="Score" sortKey="score" activeSortKey="date" direction="desc" onToggle={onToggle} />,
    );

    await userEvent.click(screen.getByRole('button'));
    expect(onToggle).toHaveBeenCalledWith('score');
  });
});
