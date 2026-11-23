import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Quality } from '../game/engine/types';

export interface Settings {
  quality: Quality;
  musicVolume: number;
  sfxVolume: number;
  shake: boolean;
  showFps: boolean;
  sensitivity: number;
  tutorialSeen: boolean;
}

const isMobile = (): boolean => typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

export const defaultQuality = (): Quality => {
  const params = typeof location !== 'undefined' ? new URLSearchParams(location.search) : null;
  const q = params?.get('quality');
  if (q === 'low' || q === 'medium' || q === 'high') return q;
  if (isMobile()) return 'medium';
  return (navigator.hardwareConcurrency ?? 4) >= 8 ? 'high' : 'medium';
};

interface SettingsStore extends Settings {
  set: (patch: Partial<Settings>) => void;
}

export const useSettings = create<SettingsStore>()(
  persist(
    (set) => ({
      quality: defaultQuality(),
      musicVolume: 0.5,
      sfxVolume: 0.8,
      shake: true,
      showFps: false,
      sensitivity: 1,
      tutorialSeen: false,
      set: (patch) => set(patch),
    }),
    { name: 'citydash-settings-v1', partialize: ({ set: _s, ...rest }) => rest },
  ),
);
