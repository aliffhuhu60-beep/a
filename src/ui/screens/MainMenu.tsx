import { motion } from 'framer-motion';
import { useState } from 'react';
import { avatarFor } from '../../data/avatars';
import { getCharacter } from '../../data/characters';
import { useAuth } from '../../state/authStore';
import { startGame } from '../../state/engineBridge';
import { useProgress } from '../../state/progressStore';
import { dailyRewardStatus } from '../../state/progressLogic';
import { Button, CoinBadge, Logo, requestFullscreen, useNav } from '../components/ui';
import { DailyRewardModal } from './DailyRewardModal';

export const MainMenu = () => {
  const nav = useNav();
  const best = useProgress((s) => s.bestScore);
  const selected = useProgress((s) => s.selectedCharacter);
  const multiplier = useProgress((s) => s.missionMultiplier);
  const reward = dailyRewardStatus({ dailyReward: useProgress((s) => s.dailyReward) });
  const daily = useProgress((s) => s.daily);
  const auth = useAuth();
  const [showReward, setShowReward] = useState(false);
  const missionsLeft = daily ? daily.missions.filter((m) => !m.done).length : 3;
  const isTouch = typeof window !== 'undefined' && 'ontouchstart' in window;

  const play = () => {
    if (isTouch) void requestFullscreen();
    startGame();
  };

  const items: { id: Parameters<typeof nav>[0]; label: string; icon: string; badge?: string | number }[] = [
    { id: 'characters', label: 'Characters', icon: '🧍' },
    { id: 'missions', label: 'Missions', icon: '🎯', badge: missionsLeft || undefined },
    { id: 'shop', label: 'Shop', icon: '🛒' },
    { id: 'leaderboard', label: 'Leaderboard', icon: '🏆' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
    { id: 'profile', label: 'Profile', icon: avatarFor(auth.profile?.avatar) },
  ];

  return (
    <motion.div className="absolute inset-0 z-20 flex safe-pad" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} data-testid="main-menu">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0b0f1f]/85 via-[#0b0f1f]/30 to-transparent" />
      <div className="relative flex w-full max-w-[560px] flex-col justify-between gap-3">
        <div className="flex items-center gap-2">
          <button data-no-swipe type="button" onClick={() => nav('profile')} className="glass flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-sm font-bold" data-testid="profile-chip">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 text-lg">{avatarFor(auth.profile?.avatar)}</span>
            {auth.status === 'authed' ? auth.profile?.username ?? 'Player' : auth.status === 'offline' ? 'Offline' : 'Guest'}
          </button>
          <CoinBadge />
          {reward.claimable && (
            <Button size="sm" variant="success" onClick={() => setShowReward(true)} data-testid="daily-reward-button">
              🎁 Daily reward
            </Button>
          )}
        </div>
        <div>
          <Logo />
          <div className="mt-2 flex flex-wrap gap-2 text-sm">
            <span className="glass rounded-full px-3 py-1" data-testid="best-score">
              Best <b>{best.toLocaleString()}</b>
            </span>
            <span className="glass rounded-full px-3 py-1">
              Multiplier <b className="text-dash-yellow">x{multiplier}</b>
            </span>
            <span className="glass rounded-full px-3 py-1">
              Runner <b className="text-dash-cyan">{getCharacter(selected).name}</b>
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <Button variant="primary" size="lg" className="play-glow w-full max-w-[360px] py-4 font-display text-3xl" onClick={play} data-testid="play-button">
            ▶ PLAY
          </Button>
          <div className="grid max-w-[480px] grid-cols-3 gap-2">
            {items.map((it) => (
              <Button key={it.id} size="sm" className="relative flex-col !gap-0.5 py-2" onClick={() => nav(it.id)} data-testid={`menu-${it.id}`}>
                <span className="text-xl leading-none">{it.icon}</span>
                <span className="text-xs sm:text-sm">{it.label}</span>
                {it.badge ? <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-dash-pink px-1 text-xs">{it.badge}</span> : null}
              </Button>
            ))}
          </div>
          <div className="hidden text-xs text-white/55 sm:block">Keyboard: A/D or ←/→ move · W/↑/Space jump · S/↓ slide · Esc pause. Touch: swipe.</div>
        </div>
      </div>
      {showReward && <DailyRewardModal onClose={() => setShowReward(false)} />}
    </motion.div>
  );
};
