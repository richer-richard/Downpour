import { NeonButton } from '../components/NeonButton';

interface StartScreenProps {
  bestWpm: number;
  onStart: () => void;
  onOpenRecords: () => void;
  onOpenSettings: () => void;
}

export function StartScreen({ bestWpm, onStart, onOpenRecords, onOpenSettings }: StartScreenProps) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div className="absolute inset-0 opacity-80">
        <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-slate-950 via-blue-950/40 to-transparent" />
        <div className="absolute inset-0 animate-drizzle bg-[linear-gradient(150deg,transparent_0%,rgba(138,226,255,0.08)_45%,transparent_100%)]" />
      </div>

      <div className="glass-panel relative z-10 w-full max-w-2xl rounded-2xl p-8 text-center sm:p-10">
        <p className="mb-3 font-display text-xs uppercase tracking-[0.28em] text-cyan-200/85">Neon Typing Rain</p>
        <h1 className="neon-text mb-3 font-display text-5xl uppercase tracking-[0.32em] sm:text-6xl">Downpour</h1>
        <p className="mx-auto mb-8 max-w-xl text-lg text-cyan-50/85">
          Words fall through a rain-soaked city. Type fast, keep the waterline down, and survive the storm.
        </p>

        <div className="mx-auto mb-7 flex w-full max-w-lg flex-wrap justify-center gap-3">
          <NeonButton onClick={onStart}>Start</NeonButton>
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
