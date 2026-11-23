import { motion } from 'framer-motion';
import { missionLabel } from '../../data/missions';
import { getEngine, startGame } from '../../state/engineBridge';
import { useGame } from '../../state/gameStore';
import { useProgress } from '../../state/progressStore';
import { Button, ProgressBar } from '../components/ui';

const SubmitLine = () => {
  const s = useGame((g) => g.submit);
  const setScreen = useGame((g) => g.setScreen);
  const text = (() => {
    switch (s.state) {
      case 'sending':
        return '⏳ Submitting to the global leaderboard…';
      case 'sent':
        return `🌍 Submitted! Global rank #${s.rank ?? '?'}${s.best ? ' · new personal best online!' : ''}`;
      case 'guest':
        return '🔒 Sign in to submit your score to the global leaderboard.';
      case 'offline':
        return '📴 Offline build: score saved on this device.';
      case 'error':
        return `⚠️ Could not submit: ${s.message}`;
      default:
        return '';
    }
  })();
  if (!text) return null;
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl bg-white/5 px-3 py-2 text-xs" data-testid="submit-status">
      <span>{text}</span>
      {s.state === 'guest' && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            getEngine()?.quitToMenu();
            setScreen('profile');
          }}
        >
          Sign in
        </Button>
      )}
    </div>
  );
};

export const GameOver = () => {
  const run = useGame((s) => s.lastRun);
  const outcome = useGame((s) => s.lastOutcome);
  const setScreen = useGame((s) => s.setScreen);
  const best = useProgress((s) => s.bestScore);
  const daily = useProgress((s) => s.daily);
  const total = useProgress((s) => s.coins);
  if (!run) return null;
  const stats: [string, string, string][] = [
    ['Score', run.score.toLocaleString(), 'final-score'],
    ['Best', best.toLocaleString(), 'best'],
    ['Coins', `+${run.coins.toLocaleString()}`, 'coins'],
    ['Distance', `${run.distance.toLocaleString()} m`, 'distance'],
  ];
  const toMenu = (screen: 'menu' | 'leaderboard' = 'menu') => {
    getEngine()?.quitToMenu();
    setScreen(screen);
  };
  return (
    <motion.div className="absolute inset-0 z-30 flex items-center justify-center bg-black/50 p-3 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} data-testid="game-over" data-no-swipe>
      <motion.div className="glass scroll-area flex max-h-full w-full max-w-xl flex-col gap-3 rounded-3xl p-4" initial={{ y: 40, scale: 0.95 }} animate={{ y: 0, scale: 1 }}>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-3xl text-dash-orange text-stroke">GAME OVER</h2>
          {outcome?.newBest && (
            <motion.span initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} className="rounded-xl bg-dash-yellow px-3 py-1 font-display text-dash-ink" data-testid="new-best">
              NEW BEST!
            </motion.span>
          )}
        </div>
        <div className="grid grid-cols-4 gap-2">
          {stats.map(([k, v, id]) => (
            <div key={k} className="rounded-2xl bg-white/5 p-2 text-center">
              <div className="text-xs text-white/60">{k}</div>
              <div className="font-display text-lg sm:text-xl" data-testid={`go-${id}`}>
                {v}
              </div>
            </div>
          ))}
        </div>
        <div className="text-right text-xs text-white/60">Coin balance: {total.toLocaleString()}</div>
        <SubmitLine />
        {daily && (
          <div className="flex flex-col gap-1.5">
            {daily.missions.map((m) => (
              <div key={m.templateId} className="text-xs">
                <div className="mb-0.5 flex justify-between">
                  <span>{m.done ? '✅' : '🎯'} {missionLabel(m)}</span>
                  <span className="text-white/60">{Math.floor(m.progress)}/{m.target}</span>
                </div>
                <ProgressBar value={m.progress} max={m.target} color={m.done ? '#3fd47a' : '#ff7a1a'} />
              </div>
            ))}
          </div>
        )}
        <div className="grid grid-cols-3 gap-2">
          <Button variant="primary" size="lg" className="col-span-3 sm:col-span-1" onClick={() => startGame()} data-testid="retry-button">
            ⟲ Retry
          </Button>
          <Button onClick={() => toMenu('menu')} data-testid="gameover-menu">
            ⌂ Main Menu
          </Button>
          <Button onClick={() => toMenu('leaderboard')} data-testid="gameover-leaderboard">
            🏆 Leaderboard
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
};
