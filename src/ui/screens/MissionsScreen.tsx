import { useEffect, useState } from 'react';
import { ACHIEVEMENTS } from '../../data/achievements';
import { MISSION_SET_BONUS, missionLabel } from '../../data/missions';
import { useProgress } from '../../state/progressStore';
import { achievementContext } from '../../state/progressLogic';
import { CoinPrice, ProgressBar, ScreenShell, Section, Tabs } from '../components/ui';
import { DailyRewardCalendar } from './DailyRewardModal';

export const MissionsScreen = () => {
  const p = useProgress();
  const [tab, setTab] = useState<'missions' | 'achievements'>('missions');
  const ensure = p.ensureDaily;
  useEffect(() => ensure(), [ensure]);
  const ctx = achievementContext(p.snapshot());
  const unlockedCount = Object.keys(p.achievements).length;
  return (
    <ScreenShell title="Missions" testId="missions-screen">
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'missions', label: 'Daily' },
          { id: 'achievements', label: `Achievements ${unlockedCount}/${ACHIEVEMENTS.length}` },
        ]}
      />
      {tab === 'missions' ? (
        <div className="grid gap-3 lg:grid-cols-2">
          <Section title={`Daily Missions · Multiplier x${p.missionMultiplier}`}>
            <p className="mb-2 text-xs text-white/70">Finish all three to raise your permanent score multiplier and earn <CoinPrice amount={MISSION_SET_BONUS} />. New missions every day.</p>
            <div className="flex flex-col gap-3" data-testid="mission-list">
              {p.daily?.missions.map((m) => (
                <div key={m.templateId} className={`rounded-2xl p-3 ${m.done ? 'bg-green-500/20' : 'bg-white/5'}`}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                    <span className="font-bold">
                      {m.done ? '✅ ' : '🎯 '}
                      {missionLabel(m)}
                    </span>
                    <CoinPrice amount={m.reward} />
                  </div>
                  <ProgressBar value={m.progress} max={m.target} color={m.done ? '#3fd47a' : '#ff7a1a'} />
                  <div className="mt-1 text-right text-xs text-white/60">
                    {Math.floor(m.progress).toLocaleString()} / {m.target.toLocaleString()}
                    {m.scope === 'single' ? ' (in one run)' : ''}
                  </div>
                </div>
              ))}
            </div>
            {p.daily?.setClaimed && <div className="mt-3 text-center text-sm text-green-300">All done for today! 🎉</div>}
          </Section>
          <Section title="Daily Reward">
            <DailyRewardCalendar />
          </Section>
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3" data-testid="achievement-list">
          {ACHIEVEMENTS.map((a) => {
            const [cur, target] = a.progress(ctx);
            const done = !!p.achievements[a.id];
            return (
              <div key={a.id} className={`glass flex gap-3 rounded-2xl p-3 ${done ? '' : 'opacity-80'}`}>
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-2xl ${done ? 'bg-dash-yellow/30' : 'bg-white/10 grayscale'}`}>{a.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between gap-2 text-sm font-bold">
                    <span>{a.name}</span>
                    <CoinPrice amount={a.reward} />
                  </div>
                  <div className="text-xs text-white/70">{a.description}</div>
                  <div className="mt-1">
                    <ProgressBar value={done ? target : cur} max={target} color={done ? '#ffd23f' : '#5a7cff'} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </ScreenShell>
  );
};
