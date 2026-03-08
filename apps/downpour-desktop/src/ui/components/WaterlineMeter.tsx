interface WaterlineMeterProps {
  waterLevel: number;
}

export function WaterlineMeter({ waterLevel }: WaterlineMeterProps) {
  const clamped = Math.max(0, Math.min(1, waterLevel));

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-cyan-100/75">
        <span>Waterline</span>
        <span>{Math.round(clamped * 100)}%</span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full border border-cyan-200/40 bg-cyan-950/70">
        <div
          className="h-full bg-gradient-to-r from-cyan-500 to-blue-300 transition-[width] duration-200"
          style={{ width: `${clamped * 100}%` }}
        />
      </div>
      <div className="text-xs uppercase tracking-[0.2em] text-amber-200/85">Words drown at the water surface</div>
    </div>
  );
}
