import type { SupabaseClient } from '@supabase/supabase-js';

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? '';
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? '';

/** True when the online backend is configured. Without it the game runs fully offline. */
export const isSupabaseConfigured = Boolean(url && anonKey && !url.includes('your-project') && !anonKey.includes('your-anon'));

let clientPromise: Promise<SupabaseClient | null> | null = null;

/** Lazily loads supabase-js (keeps it out of the initial bundle). Only the public anon key is used. */
export const getSupabase = (): Promise<SupabaseClient | null> => {
  if (!isSupabaseConfigured) return Promise.resolve(null);
  clientPromise ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'citydash-auth' },
      realtime: { params: { eventsPerSecond: 5 } },
    }),
  );
  return clientPromise;
};

/** Turns Supabase/Postgres errors into short, player-friendly messages. */
export const friendlyError = (err: unknown): string => {
  const msg = (err as { message?: string })?.message ?? String(err);
  if (/Invalid login credentials/i.test(msg)) return 'Wrong email or password.';
  if (/Email not confirmed/i.test(msg)) return 'Please confirm your email first (check your inbox).';
  if (/User already registered/i.test(msg)) return 'An account with this email already exists.';
  if (/Password should be/i.test(msg)) return 'Password must be at least 6 characters.';
  if (/rate limit|too many/i.test(msg)) return 'Too many attempts. Please wait a moment.';
  if (/player not found/i.test(msg)) return 'No player with that username.';
  if (/cannot add yourself/i.test(msg)) return "You can't add yourself.";
  if (/profiles_username_lower_idx|duplicate key/i.test(msg)) return 'That username is taken.';
  if (/Failed to fetch|NetworkError|network/i.test(msg)) return 'Network error. Check your connection.';
  return msg;
};
