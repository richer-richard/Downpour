import type { GameSettings } from '@downpour/shared';
import type { SessionEndSummary } from '../../game/gameController';
import { useGameSession } from '../hooks/useGameSession';
import { useKeyboardInput } from '../hooks/useKeyboardInput';
import { HudOverlay } from '../components/HudOverlay';
import { NeonButton } from '../components/NeonButton';

interface GameScreenProps {
  settings: GameSettings;
  globalBestWpm: number;
  onRunEnd: (summary: SessionEndSummary) => void;
  onBackToStart: () => void;
}

export function GameScreen({ settings, globalBestWpm, onRunEnd, onBackToStart }: GameScreenProps) {
  const session = useGameSession({ settings, globalBestWpm, onRunEnd });

  useKeyboardInput({
    enabled: true,
    onPrintable: session.handlePrintable,
    onBackspace: session.handleBackspace,
    onEscape: session.togglePause,
    onAnyKey: () => {
      void session.unlockAudio();
    },
  });

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#02050a]">
      <div className="absolute left-4 top-4 z-30 sm:left-6 sm:top-6">
        <NeonButton
          className="pointer-events-auto px-3 py-1 text-[11px] tracking-[0.18em]"
          onClick={onBackToStart}
          type="button"
        >
          Exit
        </NeonButton>
      </div>

      <div className="absolute inset-0">
        <canvas ref={session.setBgCanvas} className="absolute inset-0 h-full w-full" />
        <canvas ref={session.setFxCanvas} className="absolute inset-0 h-full w-full" />
        <canvas ref={session.setWordCanvas} className="absolute inset-0 h-full w-full" />
      </div>

      <HudOverlay hud={session.hud} quality={session.effectiveQuality} />

      {session.paused ? (
        <div className="absolute inset-0 z-40 grid place-items-center bg-slate-950/55">
          <div className="glass-panel rounded-lg p-6 text-center">
            <h2 className="mb-3 font-display text-2xl uppercase tracking-[0.2em] text-cyan-100">Paused</h2>
            <NeonButton
              className="pointer-events-auto"
              onClick={session.togglePause}
              type="button"
            >
              Resume
            </NeonButton>
          </div>
        </div>
      ) : null}
    </div>
  );
}
