import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WaterlineMeter } from '../WaterlineMeter';

describe('WaterlineMeter', () => {
  it('displays the percentage', () => {
    render(<WaterlineMeter waterLevel={0.42} />);
    expect(screen.getByText('42%')).toBeInTheDocument();
  });

  it('clamps values above 1', () => {
    render(<WaterlineMeter waterLevel={1.5} />);
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('clamps values below 0', () => {
    render(<WaterlineMeter waterLevel={-0.3} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('renders the label text', () => {
    render(<WaterlineMeter waterLevel={0.5} />);
    expect(screen.getByText('Waterline')).toBeInTheDocument();
  });
});
