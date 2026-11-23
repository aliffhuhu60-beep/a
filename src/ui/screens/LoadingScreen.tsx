import { motion } from 'framer-motion';
import { useGame } from '../../state/gameStore';
import { Logo } from '../components/ui';

const TIPS = [
  'Swipe up to jump, swipe down to slide.',
  'Ramps let you run on top of trains.',
  'Hitting the side of a train twice quickly ends your run!',
  'Complete all 3 daily missions to raise your score multiplier.',
  'Shields absorb one crash - use them wisely.',
  'Upgrade power-ups in the Shop to make them last longer.',
];

export const LoadingScreen = () => {
  const loading = useGame((s) => s.loading);
  const tip = TIPS[Math.floor(Date.now() / 4000) % TIPS.length];
  return (
    <motion.div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-[radial-gradient(ellipse_at_center,#1b2a6b_0%,#0b0f1f_70%)] p-6 text-center" exit={{ opacity: 0 }} data-testid="loading-screen">
      <Logo />
      {loading.error ? (
        <div className="max-w-md rounded-2xl bg-red-500/20 p-4 text-red-100">
          <div className="font-bold">Could not start the game</div>
          <div className="text-sm">{loading.error}</div>
          <div className="mt-2 text-xs text-white/70">CITY DASH 3D needs a browser with WebGL enabled.</div>
        </div>
      ) : (
        <>
          <div className="h-3 w-72 max-w-full overflow-hidden rounded-full bg-white/10">
            <motion.div className="h-full rounded-full bg-gradient-to-r from-dash-yellow to-dash-orange" animate={{ width: `${Math.round(loading.progress * 100)}%` }} />
          </div>
          <div className="text-sm text-white/70">{loading.label}…</div>
          <div className="max-w-sm text-sm text-white/60">💡 {tip}</div>
        </>
      )}
    </motion.div>
  );
};
