import { useEffect, useState } from 'react';
import { AudioManager } from '../../audio/AudioManager';
import { CHARACTERS, getCharacter } from '../../data/characters';
import { useGame } from '../../state/gameStore';
import { previewSelected } from '../../state/engineBridge';
import { useProgress } from '../../state/progressStore';
import { Button, CoinPrice } from '../components/ui';

const hex = (n: number): string => `#${n.toString(16).padStart(6, '0')}`;

/** Character list + purchase/select. Previews on the live 3D stage. */
export const CharacterPicker = ({ showSkins = true }: { showSkins?: boolean }) => {
  const p = useProgress();
  const toast = useGame((s) => s.toast);
  const [viewing, setViewing] = useState(p.selectedCharacter);
  const [viewSkin, setViewSkin] = useState<string | undefined>(undefined);
  const c = getCharacter(viewing);
  const owned = p.unlockedCharacters.includes(c.id);
  const selected = p.selectedCharacter === c.id;

  useEffect(() => {
    previewSelected(viewing, viewSkin);
  }, [viewing, viewSkin]);
  useEffect(() => () => previewSelected(), []);

  const buy = () => {
    const r = p.buyCharacter(c.id);
    if (r.ok) {
      AudioManager.play('buy');
      toast({ icon: '🎉', title: `${c.name} unlocked!` });
    } else toast({ icon: '⚠️', title: r.reason });
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between" data-testid="character-picker">
      <div className="grid grid-cols-2 gap-2 sm:w-40 sm:shrink-0 sm:grid-cols-1 lg:w-56">
        {CHARACTERS.map((ch) => {
          const isOwned = p.unlockedCharacters.includes(ch.id);
          return (
            <button
              key={ch.id}
              type="button"
              data-no-swipe
              data-testid={`character-${ch.id}`}
              onClick={() => {
                AudioManager.play('click');
                setViewing(ch.id);
                setViewSkin(undefined);
              }}
              className={`glass flex items-center gap-3 rounded-2xl p-2 text-left transition ${viewing === ch.id ? 'ring-2 ring-dash-yellow' : ''}`}
            >
              <span className="h-9 w-9 shrink-0 rounded-xl" style={{ background: `linear-gradient(135deg, ${hex(ch.colors.top)}, ${hex(ch.colors.topAccent)})` }} />
              <span className="min-w-0">
                <span className="block font-bold">{ch.name}</span>
                <span className="block text-xs text-white/70">{p.selectedCharacter === ch.id ? '✔ Selected' : isOwned ? 'Owned' : <CoinPrice amount={ch.price} />}</span>
              </span>
            </button>
          );
        })}
      </div>
      <div className="glass rounded-3xl p-4 sm:w-72 sm:shrink-0 lg:w-80">
        <div className="font-display text-2xl">{c.name}</div>
        <div className="text-sm text-dash-cyan">{c.tagline}</div>
        <p className="my-2 text-sm text-white/80">{c.bio}</p>
        {owned ? (
          <Button variant={selected ? 'ghost' : 'success'} disabled={selected} onClick={() => p.selectCharacter(c.id)} data-testid="select-character">
            {selected ? 'Selected' : 'Select'}
          </Button>
        ) : (
          <Button variant="primary" disabled={p.coins < c.price} onClick={buy} data-testid="buy-character">
            Unlock <CoinPrice amount={c.price} />
          </Button>
        )}
        {!owned && p.coins < c.price && <div className="mt-1 text-xs text-white/60">Need {(c.price - p.coins).toLocaleString()} more coins.</div>}
        {showSkins && (
          <div className="mt-4">
            <div className="mb-1 text-sm font-bold text-white/80">Skins</div>
            <div className="flex flex-col gap-2">
              {c.skins.map((s) => {
                const sOwned = p.unlockedSkins.includes(s.id);
                const sSel = p.selectedSkins[c.id] === s.id;
                return (
                  <div key={s.id} className={`flex items-center gap-2 rounded-xl bg-white/5 p-2 ${viewSkin === s.id ? 'ring-1 ring-dash-cyan' : ''}`}>
                    <button type="button" data-no-swipe className="flex-1 text-left text-sm" onClick={() => setViewSkin(s.id)} data-testid={`skin-${s.id}`}>
                      👁 {s.name}
                    </button>
                    {sOwned ? (
                      <Button size="sm" variant={sSel ? 'ghost' : 'success'} disabled={sSel || !owned} onClick={() => p.selectSkin(c.id, s.id)}>
                        {sSel ? 'Equipped' : 'Equip'}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="primary"
                        disabled={!owned || p.coins < s.price}
                        onClick={() => {
                          const r = p.buySkin(c.id, s.id);
                          if (r.ok) {
                            AudioManager.play('buy');
                            toast({ icon: '👕', title: `${s.name} skin unlocked!` });
                          } else toast({ icon: '⚠️', title: r.reason });
                        }}
                      >
                        <CoinPrice amount={s.price} />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
