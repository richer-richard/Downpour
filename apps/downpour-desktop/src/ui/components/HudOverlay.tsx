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
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between p-4 sm:p-6">
      <div className="glass-panel w-full rounded-lg p-3 text-cyan-100 sm:w-[420px]">
        <div className="mb-2 grid grid-cols-2 gap-x-4 gap-y-1 font-display text-xs uppercase tracking-[0.18em] sm:grid-cols-3">
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

      <div className="self-end rounded-md border border-cyan-200/20 bg-slate-950/35 px-3 py-1 text-xs uppercase tracking-[0.18em] text-cyan-100/70">
        ESC to pause
      </div>
    </div>
  );
}
