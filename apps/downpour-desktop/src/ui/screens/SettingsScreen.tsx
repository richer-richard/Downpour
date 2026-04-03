import { DIFFICULTY_MODES, formatDifficultyMode, type GameSettings } from '@downpour/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { NeonButton } from '../components/NeonButton';

interface SettingsScreenProps {
  settings: GameSettings;
  onChange: (settings: GameSettings) => void;
  onBack: () => void;
}

interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function Toggle({ label, checked, onChange }: ToggleProps) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4">
      <span className="font-display text-sm uppercase tracking-[0.14em]">{label}</span>
      <button
        role="switch"
        type="button"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={[
          'relative h-7 w-12 shrink-0 rounded-full border transition-colors duration-200',
          'focus:outline-none focus:ring-2 focus:ring-cyan-200/70',
          checked
            ? 'border-cyan-300/60 bg-cyan-400/25 shadow-[0_0_10px_rgba(125,249,255,0.25)]'
            : 'border-cyan-200/25 bg-slate-900/60',
        ].join(' ')}
      >
        <span
          className={[
            'absolute top-0.5 h-5 w-5 rounded-full transition-all duration-200',
            checked
              ? 'left-[1.25rem] bg-cyan-300 shadow-[0_0_8px_rgba(125,249,255,0.6)]'
              : 'left-0.5 bg-cyan-100/40',
          ].join(' ')}
        />
      </button>
    </label>
  );
}

interface NeonSelectProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}

function NeonSelect({ label, value, options, onChange }: NeonSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedLabel = options.find((opt) => opt.value === value)?.label ?? value;

  const handleSelect = useCallback(
    (optionValue: string) => {
      onChange(optionValue);
      setOpen(false);
    },
    [onChange],
  );

  useEffect(() => {
    if (!open) return undefined;

    const onClickOutside = (event: MouseEvent): void => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  return (
    <div className="flex items-center justify-between gap-4">
      <span className="font-display text-sm uppercase tracking-[0.14em]">{label}</span>
      <div ref={containerRef} className="relative">
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={label}
          onClick={() => setOpen((prev) => !prev)}
          className={[
            'flex min-w-[7.5rem] cursor-pointer items-center justify-between gap-2 rounded-md border px-3 py-1.5',
            'font-display text-sm uppercase tracking-[0.12em]',
            'transition duration-150',
            'focus:outline-none focus:ring-2 focus:ring-cyan-200/70',
            open
              ? 'border-cyan-200/60 bg-cyan-300/15 text-white shadow-[0_0_10px_rgba(125,249,255,0.15)]'
              : 'border-cyan-300/40 bg-slate-950/80 text-cyan-100 hover:border-cyan-200/60 hover:bg-cyan-300/10 hover:text-white',
          ].join(' ')}
        >
          <span>{selectedLabel}</span>
          <svg
            className={['h-3 w-3 text-cyan-300/75 transition-transform duration-200', open ? 'rotate-180' : ''].join(
              ' ',
            )}
            viewBox="0 0 12 8"
            fill="none"
          >
            <path d="M1 1l5 5 5-5" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </button>

        {open ? (
          <ul
            role="listbox"
            aria-label={label}
            className={[
              'absolute right-0 z-50 mt-1 min-w-full overflow-hidden rounded-md border',
              'border-cyan-300/40 bg-[#081420] shadow-[0_8px_24px_rgba(0,0,0,0.5)]',
            ].join(' ')}
          >
            {options.map((opt) => (
              <li
                key={opt.value}
                role="option"
                aria-selected={opt.value === value}
                onClick={() => handleSelect(opt.value)}
                className={[
                  'cursor-pointer px-3 py-1.5 font-display text-sm uppercase tracking-[0.12em]',
                  'transition duration-100',
                  opt.value === value
                    ? 'bg-cyan-400/20 text-cyan-100'
                    : 'text-cyan-100/70 hover:bg-cyan-300/10 hover:text-white',
                ].join(' ')}
              >
                {opt.label}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

export function SettingsScreen({ settings, onChange, onBack }: SettingsScreenProps) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="glass-panel w-full max-w-xl rounded-2xl p-6 sm:p-8">
        <h1 className="mb-6 font-display text-3xl uppercase tracking-[0.2em] text-cyan-100">Settings</h1>

        <div className="space-y-5 text-cyan-50/90">
          <Toggle
            label="Sound"
            checked={settings.soundEnabled}
            onChange={(checked) => onChange({ ...settings, soundEnabled: checked })}
          />

          <Toggle
            label="Reduced Motion"
            checked={settings.reducedMotion}
            onChange={(checked) => onChange({ ...settings, reducedMotion: checked })}
          />

          <NeonSelect
            label="Graphics Quality"
            value={settings.graphicsQuality}
            options={[
              { value: 'high', label: 'High' },
              { value: 'low', label: 'Low' },
            ]}
            onChange={(value) => onChange({ ...settings, graphicsQuality: value as GameSettings['graphicsQuality'] })}
          />

          <NeonSelect
            label="Difficulty"
            value={settings.difficulty}
            options={DIFFICULTY_MODES.map((mode) => ({
              value: mode,
              label: formatDifficultyMode(mode),
            }))}
            onChange={(value) => onChange({ ...settings, difficulty: value as GameSettings['difficulty'] })}
          />
        </div>

        <div className="mt-7">
          <NeonButton onClick={onBack}>Back</NeonButton>
        </div>
      </div>
    </div>
  );
}
