import type { Session } from '@supabase/supabase-js';
import { friendlyError, getSupabase } from './supabaseClient';

export interface Profile {
  id: string;
  username: string;
  avatar: string;
}

export const USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/;

export interface SignUpResult {
  needsConfirmation: boolean;
}

const requireClient = async () => {
  const sb = await getSupabase();
  if (!sb) throw new Error('Online features are not configured.');
  return sb;
};

export const authService = {
  async getSession(): Promise<Session | null> {
    const sb = await getSupabase();
    if (!sb) return null;
    const { data } = await sb.auth.getSession();
    return data.session;
  },

  async onChange(cb: (session: Session | null) => void): Promise<() => void> {
    const sb = await getSupabase();
    if (!sb) return () => undefined;
    const { data } = sb.auth.onAuthStateChange((_event, session) => cb(session));
    return () => data.subscription.unsubscribe();
  },

  async usernameAvailable(username: string): Promise<boolean> {
    const sb = await requireClient();
    const { data, error } = await sb.rpc('username_available', { p_username: username });
    if (error) throw new Error(friendlyError(error));
    return Boolean(data);
  },

  async signUp(email: string, password: string, username: string, avatar: string): Promise<SignUpResult> {
    if (!USERNAME_RE.test(username)) throw new Error('Username: 3-20 letters, numbers or _');
    const sb = await requireClient();
    if (!(await this.usernameAvailable(username))) throw new Error('That username is taken.');
    const { data, error } = await sb.auth.signUp({ email, password, options: { data: { username, avatar } } });
    if (error) throw new Error(friendlyError(error));
    return { needsConfirmation: !data.session };
  },

  async signIn(email: string, password: string): Promise<void> {
    const sb = await requireClient();
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw new Error(friendlyError(error));
  },

  async signOut(): Promise<void> {
    const sb = await getSupabase();
    if (!sb) return;
    await sb.auth.signOut();
  },

  async getProfile(userId: string): Promise<Profile | null> {
    const sb = await requireClient();
    const { data, error } = await sb.from('profiles').select('id, username, avatar').eq('id', userId).maybeSingle();
    if (error) throw new Error(friendlyError(error));
    return data as Profile | null;
  },

  async updateProfile(userId: string, patch: { username?: string; avatar?: string }): Promise<Profile> {
    if (patch.username !== undefined && !USERNAME_RE.test(patch.username)) throw new Error('Username: 3-20 letters, numbers or _');
    const sb = await requireClient();
    const { data, error } = await sb.from('profiles').update(patch).eq('id', userId).select('id, username, avatar').single();
    if (error) throw new Error(friendlyError(error));
    return data as Profile;
  },
};
