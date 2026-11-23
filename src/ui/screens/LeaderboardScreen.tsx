import { useCallback, useEffect, useRef, useState } from 'react';
import { avatarFor } from '../../data/avatars';
import { getCharacter } from '../../data/characters';
import { useAuth } from '../../state/authStore';
import { useProgress } from '../../state/progressStore';
import { friendsService } from '../../services/friendsService';
import { leaderboardService, type LeaderboardEntry } from '../../services/leaderboardService';
import { isSupabaseConfigured } from '../../services/supabaseClient';
import { Button, ScreenShell, Section, Tabs, useNav } from '../components/ui';

const Row = ({ e, onRemove }: { e: LeaderboardEntry; onRemove?: () => void }) => (
  <div className={`flex items-center gap-3 rounded-2xl px-3 py-2 ${e.isMe ? 'bg-dash-orange/30 ring-1 ring-dash-orange' : 'bg-white/5'}`} data-testid="leaderboard-row">
    <span className={`w-9 text-center font-display ${e.rank <= 3 ? 'text-dash-yellow' : 'text-white/70'}`}>{e.rank <= 3 ? ['🥇', '🥈', '🥉'][e.rank - 1] : `#${e.rank}`}</span>
    <span className="text-xl">{avatarFor(e.avatar)}</span>
    <span className="min-w-0 flex-1 truncate font-bold">
      {e.username}
      {e.isMe && <span className="ml-1 text-xs text-dash-yellow">(you)</span>}
      {e.mutual && <span className="ml-1 text-xs text-dash-cyan">⇄ friend</span>}
    </span>
    <span className="hidden text-sm text-white/70 sm:inline">{e.bestDistance.toLocaleString()} m</span>
    <span className="w-24 text-right font-display">{e.bestScore.toLocaleString()}</span>
    {onRemove && (
      <Button size="sm" variant="ghost" aria-label={`Remove ${e.username}`} onClick={onRemove}>
        ✕
      </Button>
    )}
  </div>
);

const LocalRecords = () => {
  const runs = useProgress((s) => s.localRuns);
  return (
    <Section title="Your records on this device">
      {runs.length === 0 ? (
        <p className="text-sm text-white/70">No runs yet. Play a run to set your first record!</p>
      ) : (
        <div className="flex flex-col gap-1.5" data-testid="local-records">
          {runs.map((r, i) => (
            <div key={`${r.date}-${i}`} className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-1.5 text-sm">
              <span className="w-8 font-display text-white/70">#{i + 1}</span>
              <span className="flex-1">{getCharacter(r.character).name}</span>
              <span className="text-white/70">{r.distance.toLocaleString()} m</span>
              <span className="w-24 text-right font-display">{r.score.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
};

const GlobalBoard = () => {
  const auth = useAuth();
  const [rows, setRows] = useState<LeaderboardEntry[] | null>(null);
  const [me, setMe] = useState<{ rank: number; bestScore: number; bestDistance: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await leaderboardService.global(100);
      setRows(data.map((r) => ({ ...r, isMe: r.userId === auth.userId })));
      setMe(auth.status === 'authed' ? await leaderboardService.myRank() : null);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [auth.userId, auth.status]);

  useEffect(() => {
    void load();
    let unsub: (() => void) | undefined;
    void leaderboardService
      .subscribe(() => {
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => void load(), 1500);
      })
      .then((u) => {
        unsub = u;
        setLive(true);
      });
    return () => {
      unsub?.();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [load]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs text-white/60">
        <span>Top 100 players worldwide{live ? ' · 🔴 live' : ''}</span>
        <Button size="sm" variant="ghost" onClick={() => void load()} data-testid="refresh-leaderboard">
          ⟳ Refresh
        </Button>
      </div>
      {error && <div className="rounded-xl bg-red-500/20 p-3 text-sm">{error}</div>}
      {!rows && !error && <div className="p-6 text-center text-white/70">Loading leaderboard…</div>}
      {rows && rows.length === 0 && <div className="p-6 text-center text-white/70">No scores yet. Be the first!</div>}
      <div className="flex flex-col gap-1.5" data-testid="global-leaderboard">
        {rows?.map((r) => <Row key={r.userId} e={r} />)}
      </div>
      {auth.status === 'authed' && me && (
        <div className="glass sticky bottom-0 mt-2 rounded-2xl p-3 text-sm" data-testid="my-rank">
          Your position: <b className="font-display text-dash-yellow">#{me.rank}</b> · best {me.bestScore.toLocaleString()} · {me.bestDistance.toLocaleString()} m
        </div>
      )}
      {auth.status !== 'authed' && <SignInPrompt text="Sign in to submit your scores to the global leaderboard." />}
    </div>
  );
};

const SignInPrompt = ({ text }: { text: string }) => {
  const nav = useNav();
  return (
    <div className="glass flex items-center justify-between gap-3 rounded-2xl p-3 text-sm">
      <span>{text}</span>
      <Button size="sm" variant="primary" onClick={() => nav('profile')} data-testid="goto-signin">
        Sign in
      </Button>
    </div>
  );
};

const FriendsBoard = () => {
  const auth = useAuth();
  const [rows, setRows] = useState<LeaderboardEntry[] | null>(null);
  const [name, setName] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setRows(await leaderboardService.friends());
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    }
  }, []);
  useEffect(() => {
    if (auth.status === 'authed') void load();
  }, [auth.status, load]);

  if (auth.status !== 'authed') return <SignInPrompt text="Sign in to add friends and compare scores." />;

  const add = async () => {
    setBusy(true);
    try {
      const f = await friendsService.add(name);
      setMsg({ ok: true, text: `Added ${f.username}!` });
      setName('');
      await load();
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void add();
        }}
      >
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Friend's username" className="min-w-0 flex-1 rounded-xl bg-white/10 px-3 py-2 outline-none ring-dash-orange focus:ring-2" data-testid="friend-input" maxLength={20} />
        <Button variant="primary" size="sm" disabled={busy || !name.trim()} onClick={() => void add()} data-testid="add-friend">
          + Add friend
        </Button>
      </form>
      {msg && <div className={`rounded-xl p-2 text-sm ${msg.ok ? 'bg-green-500/20' : 'bg-red-500/20'}`}>{msg.text}</div>}
      {!rows && <div className="p-4 text-center text-white/70">Loading…</div>}
      {rows && rows.length <= 1 && <div className="p-2 text-center text-sm text-white/70">Add friends by username to see how you compare.</div>}
      <div className="flex flex-col gap-1.5" data-testid="friends-leaderboard">
        {rows?.map((r) => (
          <Row
            key={r.userId}
            e={r}
            onRemove={
              r.isMe
                ? undefined
                : () =>
                    void friendsService
                      .remove(r.userId)
                      .then(load)
                      .catch((e) => setMsg({ ok: false, text: (e as Error).message }))
            }
          />
        ))}
      </div>
    </div>
  );
};

export const LeaderboardScreen = () => {
  const [tab, setTab] = useState<'global' | 'friends' | 'local'>(isSupabaseConfigured ? 'global' : 'local');
  return (
    <ScreenShell title="Leaderboard" testId="leaderboard-screen">
      {!isSupabaseConfigured ? (
        <div className="flex flex-col gap-3">
          <div className="glass rounded-2xl p-3 text-sm" data-testid="offline-notice">
            🌐 Online leaderboards are not configured for this build. Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> (see README) to enable accounts, global and friends leaderboards.
          </div>
          <LocalRecords />
        </div>
      ) : (
        <>
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { id: 'global', label: 'Global' },
              { id: 'friends', label: 'Friends' },
              { id: 'local', label: 'This device' },
            ]}
          />
          {tab === 'global' && <GlobalBoard />}
          {tab === 'friends' && <FriendsBoard />}
          {tab === 'local' && <LocalRecords />}
        </>
      )}
    </ScreenShell>
  );
};
