import { motion } from 'framer-motion';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { AudioManager } from '../../audio/AudioManager';
import { useGame, type Screen } from '../../state/gameStore';
import { useProgress } from '../../state/progressStore';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-gradient-to-b from-[#ffb347] to-[#ff6a00] text-white shadow-[0_5px_0_#a33d00] hover:brightness-110',
  secondary: 'bg-gradient-to-b from-[#3b4a8f] to-[#232c5e] text-white shadow-[0_5px_0_#141a3a] hover:brightness-125',
  ghost: 'bg-white/10 text-white hover:bg-white/20',
  danger: 'bg-gradient-to-b from-[#ff5a6a] to-[#d61f3a] text-white shadow-[0_5px_0_#7a0f20] hover:brightness-110',
  success: 'bg-gradient-to-b from-[#5be38a] to-[#1fa855] text-white shadow-[0_5px_0_#0e5c2c] hover:brightness-110',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
}

export const Button = ({ variant = 'secondary', size = 'md', icon, className = '', children, onClick, disabled, ...rest }: ButtonProps) => {
  const sizes = { sm: 'px-3 py-1.5 text-sm rounded-xl', md: 'px-4 py-2.5 text-base rounded-2xl', lg: 'px-6 py-3 text-xl rounded-2xl' };
  return (
    <button
      type="button"
      data-no-swipe
      disabled={disabled}
      onClick={(e) => {
        AudioManager.play('click');
        onClick?.(e);
      }}
      className={`inline-flex items-center justify-center gap-2 font-bold tracking-wide transition active:translate-y-[3px] active:shadow-none disabled:opacity-40 disabled:pointer-events-none select-none ${VARIANTS[variant]} ${sizes[size]} ${className}`}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
};

export const CoinBadge = ({ amount, className = '' }: { amount?: number; className?: string }) => {
  const coins = useProgress((s) => s.coins);
  return (
    <div className={`glass inline-flex items-center gap-2 rounded-full px-3 py-1 font-bold ${className}`} data-testid="coin-balance">
      <span className="inline-block h-5 w-5 rounded-full bg-gradient-to-b from-[#fff3a0] to-[#e09a00] shadow-[inset_0_-2px_0_#a86a00]" />
      <span>{(amount ?? coins).toLocaleString()}</span>
    </div>
  );
};

export const CoinPrice = ({ amount }: { amount: number }) => (
  <span className="inline-flex items-center gap-1">
    <span className="inline-block h-4 w-4 rounded-full bg-gradient-to-b from-[#fff3a0] to-[#e09a00]" />
    {amount.toLocaleString()}
  </span>
);

export const ScreenShell = ({ title, children, right, onBack, testId }: { title: string; children: ReactNode; right?: ReactNode; onBack?: () => void; testId?: string }) => {
  const setScreen = useGame((s) => s.setScreen);
  return (
    <motion.div
      data-testid={testId}
      className="absolute inset-0 z-20 flex flex-col bg-gradient-to-b from-[#0b0f1f]/70 to-[#0b0f1f]/40 safe-pad"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ duration: 0.22 }}
    >
      <div className="flex shrink-0 items-center gap-3 pb-2">
        <Button size="sm" variant="ghost" aria-label="Back" onClick={() => (onBack ? onBack() : setScreen('menu'))} data-testid="back-button">
          ← Back
        </Button>
        <h2 className="font-display text-xl sm:text-2xl">{title}</h2>
        <div className="ml-auto flex items-center gap-2">
          {right}
          <CoinBadge />
        </div>
      </div>
      <div className="scroll-area min-h-0 flex-1 pb-4">{children}</div>
    </motion.div>
  );
};

export const Tabs = <T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string }[]; value: T; onChange: (t: T) => void }) => (
  <div className="mb-3 inline-flex rounded-2xl bg-white/10 p-1" role="tablist">
    {tabs.map((t) => (
      <button
        key={t.id}
        type="button"
        role="tab"
        data-no-swipe
        aria-selected={value === t.id}
        onClick={() => {
          AudioManager.play('click');
          onChange(t.id);
        }}
        className={`rounded-xl px-4 py-1.5 text-sm font-bold transition ${value === t.id ? 'bg-white text-[#0b0f1f]' : 'text-white/80 hover:text-white'}`}
      >
        {t.label}
      </button>
    ))}
  </div>
);

export const ProgressBar = ({ value, max, color = '#ff7a1a' }: { value: number; max: number; color?: string }) => (
  <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10">
    <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, (value / Math.max(1, max)) * 100)}%`, background: color }} />
  </div>
);

export const Toggle = ({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) => (
  <label className="flex cursor-pointer items-center justify-between gap-4 py-2" data-no-swipe>
    <span>{label}</span>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => {
        AudioManager.play('click');
        onChange(!checked);
      }}
      className={`relative h-7 w-12 rounded-full transition ${checked ? 'bg-[#ff7a1a]' : 'bg-white/20'}`}
    >
      <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${checked ? 'left-6' : 'left-1'}`} />
    </button>
  </label>
);

export const Slider = ({ value, onChange, label, min = 0, max = 1, step = 0.05, format }: { value: number; onChange: (v: number) => void; label: string; min?: number; max?: number; step?: number; format?: (v: number) => string }) => (
  <label className="block py-2" data-no-swipe>
    <div className="mb-1 flex justify-between text-sm">
      <span>{label}</span>
      <span className="text-white/70">{format ? format(value) : `${Math.round(value * 100)}%`}</span>
    </div>
    <input type="range" className="w-full" aria-label={label} min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
  </label>
);

export const Section = ({ title, children, className = '' }: { title?: string; children: ReactNode; className?: string }) => (
  <section className={`glass rounded-3xl p-4 ${className}`}>
    {title && <h3 className="mb-2 font-display text-lg text-dash-yellow">{title}</h3>}
    {children}
  </section>
);

export const useNav = (): ((s: Screen) => void) => useGame((s) => s.setScreen);

export const Logo = ({ className = '' }: { className?: string }) => (
  <div className={`leading-none ${className}`}>
    <div className="logo-text text-5xl sm:text-6xl">CITY DASH</div>
    <div className="font-display text-xl tracking-[0.5em] text-dash-cyan drop-shadow-[0_2px_0_#0b0f1f] sm:text-2xl">3D</div>
  </div>
);

export const requestFullscreen = async (): Promise<void> => {
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.({ navigationUI: 'hide' });
    const o = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
    await o?.lock?.('landscape').catch(() => undefined);
  } catch {
    /* not supported (e.g. iOS Safari) */
  }
};
