import { normalizeProgress, type ProgressData } from '../state/progressLogic';
import { friendlyError, getSupabase } from './supabaseClient';

/** Cloud save for coins, unlocked characters/skins, upgrades, missions and achievements. */
export const progressService = {
  async load(userId: string): Promise<ProgressData | null> {
    const sb = await getSupabase();
    if (!sb) return null;
    const { data, error } = await sb.from('player_progress').select('data').eq('user_id', userId).maybeSingle();
    if (error) throw new Error(friendlyError(error));
    const raw = (data?.data ?? null) as Partial<ProgressData> | null;
    if (!raw || Object.keys(raw).length === 0) return null;
    return normalizeProgress(raw);
  },

  async save(userId: string, progress: ProgressData): Promise<void> {
    const sb = await getSupabase();
    if (!sb) return;
    // Local run history stays on the device.
    const { localRuns: _local, ...data } = progress;
    const { error } = await sb.from('player_progress').upsert({ user_id: userId, data }, { onConflict: 'user_id' });
    if (error) throw new Error(friendlyError(error));
  },
};
