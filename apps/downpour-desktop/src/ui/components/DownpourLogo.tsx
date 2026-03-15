import logoMarkUrl from '../../assets/branding/logo-mark.svg';

interface DownpourLogoProps {
  className?: string;
  compact?: boolean;
}

export function DownpourLogo({ className, compact = false }: DownpourLogoProps) {
  return (
    <div
      className={[
        'flex items-center justify-center text-center',
        compact ? 'gap-4 flex-row' : 'gap-3 flex-col',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <img
        alt=""
        aria-hidden="true"
        className={[
          'select-none drop-shadow-[0_0_24px_rgba(125,249,255,0.25)]',
          compact ? 'h-14 w-14' : 'h-20 w-20 sm:h-24 sm:w-24',
        ].join(' ')}
        draggable="false"
        src={logoMarkUrl}
      />

      <div className={compact ? 'text-left' : 'text-center'}>
        <div className="mb-2 font-display text-[10px] uppercase tracking-[0.34em] text-cyan-200/80">
          Neon City Typing Survival
        </div>
        <div className="downpour-wordmark">
          <span className="downpour-wordmark__rainline downpour-wordmark__rainline--1" />
          <span className="downpour-wordmark__rainline downpour-wordmark__rainline--2" />
          <span className="downpour-wordmark__rainline downpour-wordmark__rainline--3" />
          <span
            className={[
              'downpour-wordmark__text font-display uppercase',
              compact ? 'text-3xl tracking-[0.26em]' : 'text-5xl tracking-[0.3em] sm:text-6xl',
            ].join(' ')}
          >
            Downpour
          </span>
          <svg
            aria-hidden="true"
            className="downpour-wordmark__surface"
            preserveAspectRatio="none"
            viewBox="0 0 420 34"
          >
            <defs>
              <linearGradient id="downpourSurface" x1="0" y1="17" x2="420" y2="17" gradientUnits="userSpaceOnUse">
                <stop stopColor="rgba(132, 244, 255, 0.2)" />
                <stop offset="0.5" stopColor="rgba(225, 255, 255, 1)" />
                <stop offset="1" stopColor="rgba(132, 244, 255, 0.2)" />
              </linearGradient>
            </defs>
            <path
              d="M8 19C44 10 78 24 114 24C158 24 194 10 238 10C286 10 314 22 352 22C374 22 392 18 412 16"
              fill="none"
              stroke="url(#downpourSurface)"
              strokeLinecap="round"
              strokeWidth="8"
            />
          </svg>
          <span className="downpour-wordmark__cursor" />
        </div>
      </div>
    </div>
  );
}
