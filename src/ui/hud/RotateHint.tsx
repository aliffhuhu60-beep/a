import { useEffect, useState } from 'react';
import { Button } from '../components/ui';

/** Phones are played in landscape; suggest rotating (but never block). */
export const RotateHint = () => {
  const [portrait, setPortrait] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    const touch = 'ontouchstart' in window;
    const check = () => setPortrait(touch && window.innerHeight > window.innerWidth && window.innerWidth < 900);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  if (!portrait || dismissed) return null;
  return (
    <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center gap-4 bg-dash-ink/95 p-6 text-center" data-testid="rotate-hint" data-no-swipe>
      <div className="animate-pulse text-6xl">📱↻</div>
      <div className="font-display text-2xl">Rotate your device</div>
      <p className="max-w-xs text-sm text-white/70">CITY DASH 3D is designed for landscape mode.</p>
      <Button variant="ghost" size="sm" onClick={() => setDismissed(true)}>
        Play in portrait anyway
      </Button>
    </div>
  );
};
