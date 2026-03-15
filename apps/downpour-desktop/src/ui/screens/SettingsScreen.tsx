import { DIFFICULTY_MODES, formatDifficultyMode, type GameSettings } from '@downpour/shared';
import { NeonButton } from '../components/NeonButton';

interface SettingsScreenProps {
  settings: GameSettings;
  onChange: (settings: GameSettings) => void;
  onBack: () => void;
}

export function SettingsScreen({ settings, onChange, onBack }: SettingsScreenProps) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="glass-panel w-full max-w-xl rounded-2xl p-6 sm:p-8">
        <h1 className="mb-6 font-display text-3xl uppercase tracking-[0.2em] text-cyan-100">Settings</h1>

        <div className="space-y-5 text-cyan-50/90">
          <label className="flex items-center justify-between gap-4">
            <span className="font-display text-sm uppercase tracking-[0.14em]">Sound</span>
            <input
              type="checkbox"
              checked={settings.soundEnabled}
              onChange={(event) => onChange({ ...settings, soundEnabled: event.target.checked })}
            />
          </label>

          <label className="flex items-center justify-between gap-4">
            <span className="font-display text-sm uppercase tracking-[0.14em]">Reduced Motion</span>
            <input
              type="checkbox"
              checked={settings.reducedMotion}
              onChange={(event) => onChange({ ...settings, reducedMotion: event.target.checked })}
            />
          </label>

          <label className="flex items-center justify-between gap-4">
            <span className="font-display text-sm uppercase tracking-[0.14em]">Graphics Quality</span>
            <select
              className="rounded border border-cyan-200/30 bg-slate-950 px-2 py-1"
              value={settings.graphicsQuality}
              onChange={(event) =>
                onChange({ ...settings, graphicsQuality: event.target.value as GameSettings['graphicsQuality'] })
              }
            >
              <option value="high">High</option>
              <option value="low">Low</option>
            </select>
          </label>

          <label className="flex items-center justify-between gap-4">
            <span className="font-display text-sm uppercase tracking-[0.14em]">Difficulty</span>
            <select
              className="rounded border border-cyan-200/30 bg-slate-950 px-2 py-1"
              value={settings.difficulty}
              onChange={(event) =>
                onChange({ ...settings, difficulty: event.target.value as GameSettings['difficulty'] })
              }
            >
              {DIFFICULTY_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {formatDifficultyMode(mode)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-7">
          <NeonButton onClick={onBack}>Back</NeonButton>
        </div>
      </div>
    </div>
  );
}
