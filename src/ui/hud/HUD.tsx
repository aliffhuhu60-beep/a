import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { POWER_UPS } from '../../game/powerups/powerupDefs';
import { getEngine } from '../../state/engineBridge';
import { useGame } from '../../state/gameStore';
import { useProgress } from '../../state/progressStore';
import { useSettings } from '../../state/settingsStore';

export const HUD = () => {
  const hud = useGame((s) => s.hud);
  const fps = useGame((s) => s.fps);
  const flash = useGame((s) => s.stumbleFlash);
  const showFps = useSettings((s) => s.showFps);
  const best = useProgress((s) => s.bestScore);
  const [flashing, setFlashing] = useState(false);
  useEffect(() => {
    if (!flash) return;
    setFlashing(true);
    const t = setTimeout(() => setFlashing(false), 450);
    return () => clearTimeout(t);
  }, [flash]);

  return (
    <div className="pointer-events-none absolute inset-0 z-10 safe-pad" data-testid="hud">
      {(flashing || hud.stumbleWarning) && <div className={`absolute inset-0 transition-opacity ${flashing ? 'opacity-100' : 'opacity-40'}`} style={{ boxShadow: 'inset 0 0 120px 30px rgba(255,40,60,0.55)' }} />}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-display text-3xl text-white text-stroke sm:text-4xl" data-testid="hud-score">
              {hud.score.toLocaleString()}
            </span>
            {hud.multiplier > 1 && (
              <motion.span key={hud.multiplier} initial={{ scale: 1.6 }} animate={{ scale: 1 }} className="rounded-lg bg-dash-yellow px-2 py-0.5 font-display text-sm text-dash-ink" data-testid="hud-multiplier">
                x{hud.multiplier}
              </motion.span>
            )}
          </div>
          <div className="text-xs font-bold text-white/80 text-stroke">BEST {Math.max(best, hud.score).toLocaleString()}</div>
        </div>
        <div className="glass rounded-2xl px-3 py-1 text-center text-xs font-bold">
          <div data-testid="hud-distance">
            <span className="font-display text-lg">{hud.distance.toLocaleString()}</span> m
          </div>
          <div className="text-white/70" data-testid="hud-speed">{hud.speed} km/h</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="glass flex items-center gap-2 rounded-full px-3 py-1 font-display text-lg" data-testid="hud-coins">
            <span className="inline-block h-5 w-5 rounded-full bg-gradient-to-b from-[#fff3a0] to-[#e09a00]" />
            {hud.coins.toLocaleString()}
          </div>
          <button
            type="button"
            data-no-swipe
            aria-label="Pause"
            data-testid="pause-button"
            onClick={() => getEngine()?.pause()}
            className="pointer-events-auto glass flex h-11 w-11 items-center justify-center rounded-2xl text-xl font-bold active:scale-95"
          >
            ❚❚
          </button>
        </div>
      </div>
      <div className="absolute bottom-3 left-3 flex flex-col gap-1.5" data-testid="hud-powerups">
        <AnimatePresence>
          {hud.powerUps.map((p) => {
            const d = POWER_UPS[p.type];
            return (
              <motion.div key={p.type} initial={{ x: -40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -40, opacity: 0 }} className="glass flex w-44 items-center gap-2 rounded-2xl px-2 py-1" data-testid={`powerup-${p.type}`}>
                <span className="text-xl">{d.icon}</span>
                <div className="flex-1">
                  <div className="text-xs font-bold">{d.name}</div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/15">
                    <div className="h-full rounded-full" style={{ width: `${(p.remaining / p.duration) * 100}%`, background: d.css }} />
                  </div>
                </div>
                <span className="w-8 text-right text-xs tabular-nums">{Math.ceil(p.remaining)}s</span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      {showFps && <div className="absolute bottom-2 right-3 text-xs text-white/70" data-testid="fps">{fps} FPS</div>}
    </div>
  );
};

export const Countdown = () => {
  const n = useGame((s) => s.countdown);
  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
      <AnimatePresence mode="popLayout">
        {n !== null && (
          <motion.div key={n} initial={{ scale: 2.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} transition={{ duration: 0.3 }} className="font-display text-8xl text-dash-yellow text-stroke" data-testid="countdown">
            {n === 0 ? 'GO!' : n}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const Toasts = () => {
  const toasts = useGame((s) => s.toasts);
  return (
    <div className="pointer-events-none absolute left-1/2 top-16 z-40 flex w-[min(92vw,420px)] -translate-x-1/2 flex-col gap-2">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div key={t.id} layout initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }} className="glass flex items-center gap-3 rounded-2xl px-3 py-2" data-testid="toast">
            <span className="text-2xl">{t.icon}</span>
            <div>
              <div className="text-sm font-bold">{t.title}</div>
              {t.text && <div className="text-xs text-white/75">{t.text}</div>}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export const Tutorial = () => {
  const seen = useSettings((s) => s.tutorialSeen);
  const state = useGame((s) => s.gameState);
  const distance = useGame((s) => s.hud.distance);
  const [moved, setMoved] = useState(false);
  useEffect(() => {
    // Hide the hints as soon as the player makes their first move.
    const hide = () => setMoved(true);
    window.addEventListener('keydown', hide);
    window.addEventListener('pointerdown', hide);
    return () => {
      window.removeEventListener('keydown', hide);
      window.removeEventListener('pointerdown', hide);
    };
  }, []);
  if (seen || moved || !(state === 'countdown' || (state === 'running' && distance < 80))) return null;
  const touch = typeof window !== 'undefined' && 'ontouchstart' in window;
  return (
    <div className="pointer-events-none absolute inset-x-0 top-20 z-20 flex justify-center px-3" data-testid="tutorial">
      <div className="glass flex gap-3 rounded-2xl px-3 py-1.5 text-center text-[11px] sm:gap-5 sm:text-xs">
        {[
          ['⬅️', touch ? 'Swipe' : 'A / ←', 'Left'],
          ['➡️', touch ? 'Swipe' : 'D / →', 'Right'],
          ['⬆️', touch ? 'Swipe' : 'W / Space', 'Jump'],
          ['⬇️', touch ? 'Swipe' : 'S / ↓', 'Slide'],
        ].map(([i, k, l]) => (
          <div key={l} className="leading-tight">
            <div className="text-base">{i}</div>
            <div className="font-bold">{l}</div>
            <div className="text-white/70">{k}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
