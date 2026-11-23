import { create } from 'zustand';
import type { GameState, HudSnapshot, RunResult } from '../game/engine/types';
import type { RunOutcome } from './progressLogic';

export type Screen = 'menu' | 'characters' | 'missions' | 'shop' | 'leaderboard' | 'settings' | 'profile';

export interface Toast {
  id: number;
  icon: string;
  title: string;
  text?: string;
}

export type SubmitStatus = { state: 'idle' } | { state: 'sending' } | { state: 'sent'; rank: number | null; best: boolean } | { state: 'offline' } | { state: 'guest' } | { state: 'error'; message: string };

interface GameStore {
  loading: { progress: number; label: string; done: boolean; error?: string };
  gameState: GameState;
  screen: Screen;
  hud: HudSnapshot;
  countdown: number | null;
  lastRun: RunResult | null;
  lastOutcome: RunOutcome | null;
  submit: SubmitStatus;
  toasts: Toast[];
  fps: number;
  stumbleFlash: number;
  setLoading: (p: number, label: string) => void;
  setLoaded: () => void;
  setLoadError: (e: string) => void;
  setGameState: (s: GameState) => void;
  setScreen: (s: Screen) => void;
  setHud: (h: HudSnapshot) => void;
  setCountdown: (n: number | null) => void;
  setRun: (r: RunResult, o: RunOutcome) => void;
  setSubmit: (s: SubmitStatus) => void;
  toast: (t: Omit<Toast, 'id'>) => void;
  dismissToast: (id: number) => void;
  setFps: (n: number) => void;
  flashStumble: () => void;
}

let toastId = 1;

export const emptyHud = (): HudSnapshot => ({ score: 0, coins: 0, distance: 0, speed: 0, multiplier: 1, powerUps: [], stumbleWarning: false });

export const useGame = create<GameStore>((set, get) => ({
  loading: { progress: 0, label: 'Loading', done: false },
  gameState: 'loading',
  screen: 'menu',
  hud: emptyHud(),
  countdown: null,
  lastRun: null,
  lastOutcome: null,
  submit: { state: 'idle' },
  toasts: [],
  fps: 0,
  stumbleFlash: 0,
  setLoading: (progress, label) => set({ loading: { ...get().loading, progress, label } }),
  setLoaded: () => set({ loading: { ...get().loading, progress: 1, done: true } }),
  setLoadError: (error) => set({ loading: { ...get().loading, error } }),
  setGameState: (gameState) => set({ gameState }),
  setScreen: (screen) => set({ screen }),
  setHud: (hud) => set({ hud }),
  setCountdown: (countdown) => set({ countdown }),
  setRun: (lastRun, lastOutcome) => set({ lastRun, lastOutcome }),
  setSubmit: (submit) => set({ submit }),
  toast: (t) => {
    const id = toastId++;
    set({ toasts: [...get().toasts.slice(-3), { ...t, id }] });
    setTimeout(() => get().dismissToast(id), 3200);
  },
  dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
  setFps: (fps) => set({ fps }),
  flashStumble: () => set({ stumbleFlash: Date.now() }),
}));
