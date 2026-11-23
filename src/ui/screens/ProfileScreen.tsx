import { useState } from 'react';
import { AVATARS, avatarFor } from '../../data/avatars';
import { USERNAME_RE } from '../../services/authService';
import { isSupabaseConfigured } from '../../services/supabaseClient';
import { useAuth } from '../../state/authStore';
import { useProgress } from '../../state/progressStore';
import { Button, ScreenShell, Section, Tabs } from '../components/ui';

const AvatarPicker = ({ value, onChange }: { value: string; onChange: (a: string) => void }) => (
  <div className="grid grid-cols-6 gap-1.5" data-testid="avatar-picker">
    {AVATARS.map((a) => (
      <button key={a} type="button" data-no-swipe aria-label={`Avatar ${a}`} onClick={() => onChange(a)} className={`rounded-xl py-1.5 text-2xl transition ${value === a ? 'bg-dash-orange/50 ring-2 ring-dash-yellow' : 'bg-white/10 hover:bg-white/20'}`}>
        {a}
      </button>
    ))}
  </div>
);

const Field = (props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) => {
  const { label, ...rest } = props;
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-white/70">{label}</span>
      <input {...rest} className="w-full rounded-xl bg-white/10 px-3 py-2 text-base outline-none ring-dash-orange focus:ring-2" />
    </label>
  );
};

const AuthForms = () => {
  const auth = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [avatar, setAvatar] = useState<string>(AVATARS[0]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = async () => {
    setBusy(true);
    setMsg(null);
    try {
      if (mode === 'login') {
        await auth.signIn(email.trim(), password);
      } else {
        if (!USERNAME_RE.test(username)) throw new Error('Username: 3-20 letters, numbers or _');
        if (password.length < 6) throw new Error('Password must be at least 6 characters.');
        const r = await auth.signUp(email.trim(), password, username, avatar);
        setMsg({ ok: true, text: r.needsConfirmation ? 'Account created! Check your email to confirm, then log in.' : 'Welcome to CITY DASH!' });
        if (r.needsConfirmation) setMode('login');
      }
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section className="max-w-lg">
      <p className="mb-3 text-sm text-white/80">You are playing as a <b>Guest</b>. Progress is saved on this device. Create an account to save it online and compete on the leaderboard.</p>
      <Tabs
        value={mode}
        onChange={(m) => {
          setMode(m);
          setMsg(null);
        }}
        tabs={[
          { id: 'login', label: 'Log in' },
          { id: 'register', label: 'Register' },
        ]}
      />
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        data-testid={`${mode}-form`}
      >
        {mode === 'register' && <Field label="Username" value={username} onChange={(e) => setUsername(e.target.value)} maxLength={20} autoComplete="username" required data-testid="username-input" />}
        <Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required data-testid="email-input" />
        <Field label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={6} required data-testid="password-input" />
        {mode === 'register' && (
          <div>
            <div className="mb-1 text-sm text-white/70">Avatar</div>
            <AvatarPicker value={avatar} onChange={setAvatar} />
          </div>
        )}
        {msg && <div className={`rounded-xl p-2 text-sm ${msg.ok ? 'bg-green-500/20' : 'bg-red-500/20'}`} data-testid="auth-message">{msg.text}</div>}
        <Button variant="primary" disabled={busy} onClick={() => void submit()} data-testid="auth-submit">
          {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
        </Button>
      </form>
    </Section>
  );
};

const AccountPanel = () => {
  const auth = useAuth();
  const [username, setUsername] = useState(auth.profile?.username ?? '');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const save = async (patch: { username?: string; avatar?: string }) => {
    try {
      await auth.updateProfile(patch);
      setMsg({ ok: true, text: 'Profile saved.' });
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    }
  };
  return (
    <Section title="Account" className="max-w-lg">
      <div className="mb-3 flex items-center gap-3">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-4xl">{avatarFor(auth.profile?.avatar)}</span>
        <div>
          <div className="font-display text-xl" data-testid="profile-username">{auth.profile?.username}</div>
          <div className="text-xs text-white/60">{auth.email}</div>
          <div className="text-xs text-white/60">{auth.syncing ? 'Syncing…' : auth.lastSyncError ? `Sync error: ${auth.lastSyncError}` : '☁️ Progress saved online'}</div>
        </div>
      </div>
      <div className="mb-2 text-sm text-white/70">Avatar</div>
      <AvatarPicker value={avatarFor(auth.profile?.avatar)} onChange={(a) => void save({ avatar: a })} />
      <form
        className="mt-3 flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void save({ username });
        }}
      >
        <div className="flex-1">
          <Field label="Username" value={username} onChange={(e) => setUsername(e.target.value)} maxLength={20} />
        </div>
        <Button size="sm" variant="primary" disabled={username === auth.profile?.username} onClick={() => void save({ username })}>
          Save
        </Button>
      </form>
      {msg && <div className={`mt-2 rounded-xl p-2 text-sm ${msg.ok ? 'bg-green-500/20' : 'bg-red-500/20'}`}>{msg.text}</div>}
      <div className="mt-4 flex gap-2">
        <Button size="sm" variant="ghost" onClick={() => void auth.syncNow()}>
          ☁️ Sync now
        </Button>
        <Button size="sm" variant="danger" onClick={() => void auth.signOut()} data-testid="logout">
          Log out
        </Button>
      </div>
    </Section>
  );
};

const Stats = () => {
  const p = useProgress();
  const items: [string, string][] = [
    ['Best score', p.bestScore.toLocaleString()],
    ['Best distance', `${p.bestDistance.toLocaleString()} m`],
    ['Runs', p.totals.runs.toLocaleString()],
    ['Total distance', `${Math.round(p.totals.distance).toLocaleString()} m`],
    ['Coins collected', p.totals.coins.toLocaleString()],
    ['Jumps', p.totals.jumps.toLocaleString()],
    ['Slides', p.totals.slides.toLocaleString()],
    ['Score multiplier', `x${p.missionMultiplier}`],
  ];
  return (
    <Section title="Stats" className="max-w-lg">
      <div className="grid grid-cols-2 gap-2 text-sm" data-testid="stats">
        {items.map(([k, v]) => (
          <div key={k} className="rounded-xl bg-white/5 px-3 py-2">
            <div className="text-xs text-white/60">{k}</div>
            <div className="font-bold">{v}</div>
          </div>
        ))}
      </div>
    </Section>
  );
};

export const ProfileScreen = () => {
  const status = useAuth((s) => s.status);
  return (
    <ScreenShell title="Profile" testId="profile-screen">
      <div className="flex flex-col gap-3 lg:flex-row">
        {!isSupabaseConfigured ? (
          <Section title="Offline mode" className="max-w-lg">
            <p className="text-sm text-white/80">Online accounts are not configured for this build, so you are playing as a guest and progress is stored on this device. See the README to connect Supabase.</p>
          </Section>
        ) : status === 'loading' ? (
          <Section className="max-w-lg">Connecting…</Section>
        ) : status === 'authed' ? (
          <AccountPanel />
        ) : (
          <AuthForms />
        )}
        <Stats />
      </div>
    </ScreenShell>
  );
};
