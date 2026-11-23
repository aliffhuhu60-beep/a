import { friendlyError, getSupabase } from './supabaseClient';

const client = async () => {
  const sb = await getSupabase();
  if (!sb) throw new Error('Online features are not configured.');
  return sb;
};

export const friendsService = {
  async add(username: string): Promise<{ id: string; username: string }> {
    const name = username.trim();
    if (!name) throw new Error('Enter a username.');
    const sb = await client();
    const { data, error } = await sb.rpc('add_friend', { p_username: name });
    if (error) throw new Error(friendlyError(error));
    return data as { id: string; username: string };
  },

  async remove(friendId: string): Promise<void> {
    const sb = await client();
    const { error } = await sb.from('friendships').delete().eq('friend_id', friendId);
    if (error) throw new Error(friendlyError(error));
  },
};
