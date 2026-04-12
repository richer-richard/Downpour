import { NeonButton } from '../components/NeonButton';
import { DownpourLogo } from '../components/DownpourLogo';

interface StartScreenProps {
  bestWpm: number;
  onStart: () => void;
  onOpenLearn: () => void;
  onOpenRecords: () => void;
  onOpenSettings: () => void;
}

export function StartScreen({
  bestWpm,
  onStart,
  onOpenLearn,
  onOpenRecords,
  onOpenSettings,
}: StartScreenProps) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div aria-hidden="true" className="start-screen-ambient">
        <div className="start-screen-ambient__wash" />
        <div className="start-screen-ambient__layer start-screen-ambient__layer--primary" />
        <div className="start-screen-ambient__layer start-screen-ambient__layer--secondary" />
        <div className="start-screen-ambient__veil" />
      </div>

      <div className="glass-panel relative z-10 w-full max-w-2xl rounded-2xl p-8 text-center sm:p-10">
        <DownpourLogo className="mb-4" />
        <p className="mx-auto mb-8 max-w-xl text-lg text-cyan-50/85">
          Words fall through a rain-soaked city. Type fast, keep the waterline down, and survive the storm.
        </p>

        <div className="mx-auto mb-7 flex w-full max-w-lg flex-wrap justify-center gap-3">
          <NeonButton onClick={onStart}>Start</NeonButton>
          <NeonButton onClick={onOpenLearn}>Learn</NeonButton>
          <NeonButton onClick={onOpenRecords}>Records</NeonButton>
          <NeonButton onClick={onOpenSettings}>Settings</NeonButton>
        </div>

        <div className="font-display text-sm uppercase tracking-[0.22em] text-cyan-100/75">
          Best WPM: {bestWpm.toFixed(1)}
        </div>
      </div>
    </div>
  );
}
