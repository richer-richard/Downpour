import type { HudSnapshot } from '../../game/gameController';
import { WaterlineMeter } from './WaterlineMeter';

interface HudOverlayProps {
  hud: HudSnapshot;
  quality: 'high' | 'low';
}

function asPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function asNumber(value: number): string {
  return Number.isFinite(value) ? value.toFixed(1) : '0.0';
}

export function HudOverlay({ hud, quality }: HudOverlayProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      <div className="glass-panel absolute bottom-20 right-4 w-[min(24rem,calc(100vw-2rem))] rounded-lg p-3 text-cyan-100 sm:bottom-24 sm:right-6 sm:w-[24rem]">
        <div className="mb-2 grid grid-cols-2 gap-x-4 gap-y-1 font-display text-xs uppercase tracking-[0.16em]">
          <span>Score: {hud.score}</span>
          <span>Level: {hud.level}</span>
          <span>Combo: x{(1 + Math.min(hud.combo, 20) * 0.05).toFixed(2)}</span>
          <span>Accuracy: {asPercent(hud.accuracy)}</span>
          <span>WPM: {asNumber(hud.currentWpm)}</span>
          <span>Session Peak: {asNumber(hud.sessionBestWpm)}</span>
          <span>Best WPM: {asNumber(hud.globalBestWpm)}</span>
          <span>Mode: {quality.toUpperCase()}</span>
        </div>
        <WaterlineMeter waterLevel={hud.waterLevel} lives={hud.lives} />
      </div>

      <div className="absolute right-4 top-4 rounded-md border border-cyan-200/20 bg-slate-950/35 px-3 py-1 text-xs uppercase tracking-[0.18em] text-cyan-100/70 sm:right-6 sm:top-6">
        ESC to pause
      </div>
    </div>
  );
}
