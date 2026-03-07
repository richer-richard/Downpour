import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';

type NeonButtonProps = PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>>;

export function NeonButton({ children, className, ...rest }: NeonButtonProps) {
  return (
    <button
      className={[
        'rounded-md border border-cyan-300/50 bg-cyan-300/10 px-5 py-2 font-display text-sm uppercase tracking-[0.24em] text-cyan-100',
        'transition duration-150 hover:border-cyan-200 hover:bg-cyan-300/20 hover:text-white hover:shadow-neon',
        'focus:outline-none focus:ring-2 focus:ring-cyan-200/70',
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </button>
  );
}
