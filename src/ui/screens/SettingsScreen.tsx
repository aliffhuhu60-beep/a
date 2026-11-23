import { useState } from 'react';
import type { Quality } from '../../game/engine/types';
import { useProgress } from '../../state/progressStore';
import { useSettings } from '../../state/settingsStore';
import { useGame } from '../../state/gameStore';
import { Button, ScreenShell, Section, Slider, Toggle, requestFullscreen } from '../components/ui';
import { AudioSettings } from '../components/AudioSettings';

export const SettingsScreen = () => {
  const s = useSettings();
  const reset = useProgress((p) => p.reset);
  const toast = useGame((g) => g.toast);
  const [confirm, setConfirm] = useState(false);
  const qualities: { id: Quality; label: string; hint: string }[] = [
    { id: 'low', label: 'Low', hint: 'No shadows, lower resolution. Best for older phones.' },
    { id: 'medium', label: 'Medium', hint: 'Shadows, balanced resolution.' },
    { id: 'high', label: 'High', hint: 'Full resolution, bloom and speed blur.' },
  ];
  return (
    <ScreenShell title="Settings" testId="settings-screen">
      <div className="grid gap-3 lg:grid-cols-2">
        <Section title="Graphics">
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Graphics quality">
            {qualities.map((q) => (
              <Button key={q.id} size="sm" variant={s.quality === q.id ? 'primary' : 'ghost'} aria-pressed={s.quality === q.id} onClick={() => s.set({ quality: q.id })} data-testid={`quality-${q.id}`}>
                {q.label}
              </Button>
            ))}
          </div>
          <p className="mt-2 text-xs text-white/60">{qualities.find((q) => q.id === s.quality)?.hint}</p>
          <Toggle label="Camera shake" checked={s.shake} onChange={(v) => s.set({ shake: v })} />
          <Toggle label="Show FPS" checked={s.showFps} onChange={(v) => s.set({ showFps: v })} />
          <Button size="sm" variant="ghost" onClick={() => void requestFullscreen()}>
            ⛶ Fullscreen
          </Button>
        </Section>
        <Section title="Audio">
          <AudioSettings />
        </Section>
        <Section title="Controls">
          <Slider label="Swipe sensitivity" min={0.5} max={2} step={0.1} value={s.sensitivity} onChange={(v) => s.set({ sensitivity: v })} format={(v) => `${v.toFixed(1)}x`} />
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-xl bg-white/5 p-2">
              <div className="font-bold">⌨️ Keyboard</div>
              <div className="text-white/70">A / ← left · D / → right</div>
              <div className="text-white/70">W / ↑ / Space jump</div>
              <div className="text-white/70">S / ↓ slide · Esc pause</div>
            </div>
            <div className="rounded-xl bg-white/5 p-2">
              <div className="font-bold">👆 Touch</div>
              <div className="text-white/70">Swipe ← → to change lane</div>
              <div className="text-white/70">Swipe ↑ to jump</div>
              <div className="text-white/70">Swipe ↓ to slide</div>
            </div>
          </div>
          <Toggle label="Show tutorial on next run" checked={!s.tutorialSeen} onChange={(v) => s.set({ tutorialSeen: !v })} />
        </Section>
        <Section title="Data">
          <p className="mb-2 text-sm text-white/70">Resetting deletes the progress stored on this device (coins, unlocks, missions). Online progress is kept on your account.</p>
          {confirm ? (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="danger"
                onClick={() => {
                  reset();
                  setConfirm(false);
                  toast({ icon: '🗑️', title: 'Progress reset' });
                }}
                data-testid="confirm-reset"
              >
                Yes, reset
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirm(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="danger" onClick={() => setConfirm(true)} data-testid="reset-progress">
              Reset local progress
            </Button>
          )}
          <p className="mt-3 text-xs text-white/50">CITY DASH 3D · original game, characters, art, music and sound. Built with Three.js, React and Supabase.</p>
        </Section>
      </div>
    </ScreenShell>
  );
};
