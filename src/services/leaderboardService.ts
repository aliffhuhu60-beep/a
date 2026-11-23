import type { RunResult } from '../game/engine/types';
import { friendlyError, getSupabase } from './supabaseClient';

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatar: string;
  bestScore: number;
  bestDistance: number;
  isMe?: boolean;
  mutual?: boolean;
}

export interface SubmitResponse {
  bestScore: number;
  isBest: boolean;
  rank: number | null;
}

interface Row {
  rank: number | string;
  user_id: string;
  username: string;
  avatar: string;
  best_score: number | string;
  best_distance: number | string;
  is_me?: boolean;
  mutual?: boolean;
}

const mapRow = (r: Row): LeaderboardEntry => ({
  rank: Number(r.rank),
  userId: r.user_id,
  username: r.username,
  avatar: r.avatar,
  bestScore: Number(r.best_score),
  bestDistance: Number(r.best_distance),
  isMe: r.is_me,
  mutual: r.mutual,
});

const client = async () => {
  const sb = await getSupabase();
  if (!sb) throw new Error('Online features are not configured.');
  return sb;
};

export const leaderboardService = {
  async submitRun(r: RunResult): Promise<SubmitResponse> {
    const sb = await client();
    const { data, error } = await sb.rpc('submit_run', {
      p_score: Math.floor(r.score),
      p_distance: Math.floor(r.distance),
      p_coins: Math.floor(r.coins),
      p_duration_ms: Math.floor(r.durationMs),
      p_character: r.character,
    });
    if (error) throw new Error(friendlyError(error));
    const d = data as { best_score: number; is_best: boolean; rank: number };
    return { bestScore: Number(d.best_score), isBest: Boolean(d.is_best), rank: d.rank == null ? null : Number(d.rank) };
  },

  async global(limit = 100): Promise<LeaderboardEntry[]> {
    const sb = await client();
    const { data, error } = await sb.rpc('get_leaderboard', { p_limit: limit });
    if (error) throw new Error(friendlyError(error));
    return ((data ?? []) as Row[]).map(mapRow);
  },

  async myRank(): Promise<{ rank: number; bestScore: number; bestDistance: number } | null> {
    const sb = await client();
    const { data, error } = await sb.rpc('get_my_rank');
    if (error) throw new Error(friendlyError(error));
    const row = (data as { rank: number; best_score: number; best_distance: number }[] | null)?.[0];
    return row ? { rank: Number(row.rank), bestScore: Number(row.best_score), bestDistance: Number(row.best_distance) } : null;
  },

  async friends(): Promise<LeaderboardEntry[]> {
    const sb = await client();
    const { data, error } = await sb.rpc('get_friends_leaderboard');
    if (error) throw new Error(friendlyError(error));
    return ((data ?? []) as Row[]).map(mapRow);
  },

  /** Supabase Realtime: notifies when any player's stats change. Returns an unsubscribe function. */
  async subscribe(onChange: () => void): Promise<() => void> {
    const sb = await getSupabase();
    if (!sb) return () => undefined;
    const channel = sb
      .channel('leaderboard-stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'player_stats' }, () => onChange())
      .subscribe();
    return () => {
      void sb.removeChannel(channel);
    };
  },
};
