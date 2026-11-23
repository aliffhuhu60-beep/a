import { create } from 'zustand';
import { authService, type Profile } from '../services/authService';
import { progressService } from '../services/progressService';
import { isSupabaseConfigured } from '../services/supabaseClient';
import { useProgress } from './progressStore';
import { mergeProgress } from './progressLogic';

export type AuthStatus = 'offline' | 'loading' | 'guest' | 'authed';

interface AuthStore {
  status: AuthStatus;
  userId: string | null;
  email: string | null;
  profile: Profile | null;
  syncing: boolean;
  lastSyncError: string | null;
  init: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string, avatar: string) => Promise<{ needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
  updateProfile: (patch: { username?: string; avatar?: string }) => Promise<void>;
  syncNow: () => Promise<void>;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let unsubProgress: (() => void) | null = null;
let initialized = false;

export const useAuth = create<AuthStore>((set, get) => {
  /** Loads cloud progress on login and merges in anything earned as a guest. */
  const onSession = async (userId: string | null, email: string | null): Promise<void> => {
    if (!userId) {
      unsubProgress?.();
      unsubProgress = null;
      set({ status: 'guest', userId: null, email: null, profile: null });
      return;
    }
    if (get().userId === userId && get().status === 'authed') return;
    set({ status: 'authed', userId, email });
    try {
      const [profile, cloud] = await Promise.all([authService.getProfile(userId), progressService.load(userId)]);
      set({ profile });
      const local = useProgress.getState().snapshot();
      const merged = cloud ? mergeProgress(cloud, local) : local;
      useProgress.getState().hydrateFrom(merged);
      await progressService.save(userId, merged);
      set({ lastSyncError: null });
    } catch (e) {
      set({ lastSyncError: (e as Error).message });
    }
    // Debounced cloud save whenever progress changes.
    unsubProgress?.();
    unsubProgress = useProgress.subscribe(() => {
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(() => void get().syncNow(), 1500);
    });
  };

  return {
    status: isSupabaseConfigured ? 'loading' : 'offline',
    userId: null,
    email: null,
    profile: null,
    syncing: false,
    lastSyncError: null,
    init: async () => {
      if (initialized || !isSupabaseConfigured) return;
      initialized = true;
      try {
        const session = await authService.getSession();
        await onSession(session?.user.id ?? null, session?.user.email ?? null);
        await authService.onChange((s) => void onSession(s?.user.id ?? null, s?.user.email ?? null));
      } catch (e) {
        set({ status: 'guest', lastSyncError: (e as Error).message });
      }
    },
    signIn: async (email, password) => {
      await authService.signIn(email, password);
      const s = await authService.getSession();
      await onSession(s?.user.id ?? null, s?.user.email ?? null);
    },
    signUp: async (email, password, username, avatar) => {
      const r = await authService.signUp(email, password, username, avatar);
      if (!r.needsConfirmation) {
        const s = await authService.getSession();
        await onSession(s?.user.id ?? null, s?.user.email ?? null);
      }
      return r;
    },
    signOut: async () => {
      await get().syncNow();
      await authService.signOut();
      await onSession(null, null);
    },
    updateProfile: async (patch) => {
      const id = get().userId;
      if (!id) throw new Error('Not signed in');
      const profile = await authService.updateProfile(id, patch);
      set({ profile });
    },
    syncNow: async () => {
      const id = get().userId;
      if (!id) return;
      set({ syncing: true });
      try {
        await progressService.save(id, useProgress.getState().snapshot());
        set({ lastSyncError: null });
      } catch (e) {
        set({ lastSyncError: (e as Error).message });
      } finally {
        set({ syncing: false });
      }
    },
  };
});
