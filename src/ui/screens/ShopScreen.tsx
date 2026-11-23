import { useState } from 'react';
import { AudioManager } from '../../audio/AudioManager';
import type { PowerUpType } from '../../game/engine/types';
import { MAX_UPGRADE_LEVEL, POWER_UPS, UPGRADE_COSTS, powerUpDuration } from '../../game/powerups/powerupDefs';
import { useGame } from '../../state/gameStore';
import { useProgress } from '../../state/progressStore';
import { Button, CoinPrice, ScreenShell, Tabs } from '../components/ui';
import { CharacterPicker } from './CharacterPicker';
import { useShowcase } from './CharactersScreen';

const PowerUpShop = () => {
  const upgrades = useProgress((s) => s.upgrades);
  const coins = useProgress((s) => s.coins);
  const buy = useProgress((s) => s.buyUpgrade);
  const toast = useGame((s) => s.toast);
  return (
    <div className="grid gap-3 sm:grid-cols-2" data-testid="powerup-shop">
      {(Object.keys(POWER_UPS) as PowerUpType[]).map((t) => {
        const d = POWER_UPS[t];
        const lvl = upgrades[t];
        const maxed = lvl >= MAX_UPGRADE_LEVEL;
        const cost = UPGRADE_COSTS[lvl];
        return (
          <div key={t} className="glass rounded-3xl p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl text-2xl" style={{ background: `${d.css}33` }}>
                {d.icon}
              </span>
              <div>
                <div className="font-bold">{d.name}</div>
                <div className="text-xs text-white/70">{d.description}</div>
              </div>
            </div>
            <div className="my-3 flex gap-1">
              {Array.from({ length: MAX_UPGRADE_LEVEL }, (_, i) => (
                <span key={i} className="h-2.5 flex-1 rounded-full" style={{ background: i < lvl ? d.css : 'rgba(255,255,255,0.15)' }} />
              ))}
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>
                Duration: <b>{powerUpDuration(t, lvl).toFixed(1)}s</b>
                {!maxed && <span className="text-white/60"> → {powerUpDuration(t, lvl + 1).toFixed(1)}s</span>}
              </span>
              <Button
                size="sm"
                variant="primary"
                disabled={maxed || coins < cost}
                data-testid={`upgrade-${t}`}
                onClick={() => {
                  const r = buy(t);
                  if (r.ok) {
                    AudioManager.play('buy');
                    toast({ icon: d.icon, title: `${d.name} upgraded to level ${lvl + 1}` });
                  }
                }}
              >
                {maxed ? 'MAX' : <CoinPrice amount={cost} />}
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const ShopScreen = () => {
  useShowcase();
  const [tab, setTab] = useState<'characters' | 'skins' | 'powerups'>('characters');
  return (
    <ScreenShell title="Shop" testId="shop-screen">
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'characters', label: 'Characters' },
          { id: 'skins', label: 'Skins' },
          { id: 'powerups', label: 'Power-ups' },
        ]}
      />
      {tab === 'characters' && <CharacterPicker showSkins={false} />}
      {tab === 'skins' && <CharacterPicker showSkins />}
      {tab === 'powerups' && <PowerUpShop />}
    </ScreenShell>
  );
};
