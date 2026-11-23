import { motion } from 'framer-motion';
import { AudioManager } from '../../audio/AudioManager';
import { DAILY_REWARDS } from '../../data/rewards';
import { useGame } from '../../state/gameStore';
import { useProgress } from '../../state/progressStore';
import { dailyRewardStatus } from '../../state/progressLogic';
import { Button, CoinPrice } from '../components/ui';

export const DailyRewardCalendar = () => {
  const status = dailyRewardStatus({ dailyReward: useProgress((s) => s.dailyReward) });
  const claim = useProgress((s) => s.claimDaily);
  const toast = useGame((s) => s.toast);
  return (
    <div>
      <div className="grid grid-cols-7 gap-1.5">
        {DAILY_REWARDS.map((amt, i) => {
          const day = i + 1;
          const claimed = status.claimable ? day < status.day : day <= status.day;
          const today = status.claimable && day === status.day;
          return (
            <div key={day} className={`flex flex-col items-center rounded-xl p-1.5 text-xs ${today ? 'bg-dash-orange/40 ring-2 ring-dash-yellow' : claimed ? 'bg-green-500/25' : 'bg-white/10'}`}>
              <span className="text-white/70">Day {day}</span>
              <span className="text-lg">{claimed ? '✅' : day === 7 ? '💎' : '🪙'}</span>
              <span className="font-bold">{amt}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-sm text-white/70">{status.claimable ? `Day ${status.day} reward is ready!` : 'Come back tomorrow to keep your streak.'}</span>
        <Button
          variant="success"
          size="sm"
          disabled={!status.claimable}
          data-testid="claim-reward"
          onClick={() => {
            const r = claim();
            if (r.ok) {
              AudioManager.play('buy');
              toast({ icon: '🎁', title: 'Daily reward claimed', text: `+${status.amount} coins` });
            }
          }}
        >
          Claim <CoinPrice amount={status.amount} />
        </Button>
      </div>
    </div>
  );
};

export const DailyRewardModal = ({ onClose }: { onClose: () => void }) => (
  <motion.div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} data-no-swipe>
    <div className="glass w-full max-w-lg rounded-3xl p-5">
      <h3 className="mb-3 font-display text-2xl text-dash-yellow">Daily Reward</h3>
      <DailyRewardCalendar />
      <div className="mt-4 text-right">
        <Button size="sm" variant="ghost" onClick={onClose} data-testid="close-reward">
          Close
        </Button>
      </div>
    </div>
  </motion.div>
);
