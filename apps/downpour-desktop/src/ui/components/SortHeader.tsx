import type { SortKey } from '@downpour/shared';
import type { SortDirection } from '../../tauri/mappers';

interface SortHeaderProps {
  label: string;
  sortKey: SortKey;
  activeSortKey: SortKey;
  direction: SortDirection;
  onToggle: (key: SortKey) => void;
}

export function SortHeader(props: SortHeaderProps) {
  const { label, sortKey, activeSortKey, direction, onToggle } = props;
  const active = activeSortKey === sortKey;

  return (
    <button
      className="inline-flex items-center gap-1 text-left font-display text-xs uppercase tracking-[0.15em] text-cyan-100/90 hover:text-white"
      type="button"
      onClick={() => onToggle(sortKey)}
    >
      <span>{label}</span>
      <span className="text-cyan-200/75">{active ? (direction === 'asc' ? '▲' : '▼') : '·'}</span>
    </button>
  );
}
