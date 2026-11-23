/**
 * Runs the real Supabase migration on PostgreSQL (PGlite, Postgres compiled to
 * WASM) with a minimal stand-in for Supabase's `auth` schema and roles, then
 * verifies Row Level Security and the RPC functions as `anon`/`authenticated`.
 */
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

const MIGRATIONS = join(__dirname, '../../supabase/migrations');

const SUPABASE_STUB = `
create role anon nologin;
create role authenticated nologin;
create schema auth;
grant usage on schema auth to anon, authenticated;
create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}'::jsonb);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant execute on function auth.uid() to anon, authenticated;
grant usage on schema public to anon, authenticated;
`;

const A = '11111111-1111-1111-1111-111111111111';
const B = '22222222-2222-2222-2222-222222222222';
const C = '33333333-3333-3333-3333-333333333333';

let db: PGlite;

/** Run statements as a given Supabase role / user (like PostgREST does). */
const as = async <T = Record<string, unknown>>(role: 'anon' | 'authenticated', uid: string | null, sql: string, params: unknown[] = []): Promise<T[]> => {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid ?? ''}', false); set role ${role};`);
  try {
    const r = await db.query<T>(sql, params);
    return r.rows;
  } finally {
    await db.exec('reset role;');
  }
};

const expectError = async (p: Promise<unknown>, match: RegExp): Promise<void> => {
  await expect(p).rejects.toThrow(match);
};

beforeAll(async () => {
  db = new PGlite();
  await db.exec(SUPABASE_STUB);
  for (const f of readdirSync(MIGRATIONS).sort()) await db.exec(readFileSync(join(MIGRATIONS, f), 'utf8'));
  await db.exec(`
    insert into auth.users (id, email, raw_user_meta_data) values
      ('${A}', 'a@test.dev', '{"username":"Alice","avatar":"🐼"}'),
      ('${B}', 'b@test.dev', '{"username":"bob"}'),
      ('${C}', 'c@test.dev', '{"username":"alice"}');
  `);
}, 60000);

describe('sign-up trigger', () => {
  it('creates a profile, stats and progress row with a unique username', async () => {
    const rows = await db.query<{ id: string; username: string; avatar: string }>('select id, username, avatar from public.profiles order by username');
    const byId = Object.fromEntries(rows.rows.map((r) => [r.id, r]));
    expect(byId[A].username).toBe('Alice');
    expect(byId[A].avatar).toBe('🐼');
    expect(byId[C].username).toBe('alice1'); // case-insensitive clash resolved
    const stats = await db.query('select * from public.player_stats');
    expect(stats.rows).toHaveLength(3);
    const prog = await db.query('select * from public.player_progress');
    expect(prog.rows).toHaveLength(3);
  });
});

describe('submit_run + leaderboard', () => {
  it('rejects anonymous submissions', async () => {
    await expectError(as('anon', null, 'select public.submit_run(100, 100, 10, 60000, $1)', ['rio']), /permission denied|not authenticated/);
  });

  it('accepts a valid run and updates best score', async () => {
    const [r] = await as<{ submit_run: { best_score: number; is_best: boolean; rank: number } }>('authenticated', A, 'select public.submit_run(5000, 1200, 150, 70000, $1)', ['rio']);
    expect(r.submit_run.best_score).toBe(5000);
    expect(r.submit_run.is_best).toBe(true);
    expect(r.submit_run.rank).toBe(1);
  });

  it('rejects implausible runs', async () => {
    await expectError(as('authenticated', B, 'select public.submit_run(1000, 5000, 10, 1000, $1)', ['rio']), /implausible distance/);
    await expectError(as('authenticated', B, 'select public.submit_run(999999999, 100, 10, 60000, $1)', ['rio']), /implausible score/);
    await expectError(as('authenticated', B, 'select public.submit_run(-1, 100, 10, 60000, $1)', ['rio']), /invalid run/);
  });

  it('rate-limits rapid submissions', async () => {
    await as('authenticated', B, 'select public.submit_run(3000, 800, 90, 50000, $1)', ['mika']);
    await expectError(as('authenticated', B, 'select public.submit_run(3100, 800, 90, 50000, $1)', ['mika']), /too many submissions/);
  });

  it('orders the global leaderboard and is readable by anon', async () => {
    const rows = await as<{ rank: number; username: string; best_score: number }>('anon', null, 'select * from public.get_leaderboard(100)');
    expect(rows.map((r) => r.username)).toEqual(['Alice', 'bob']);
    expect(Number(rows[0].rank)).toBe(1);
    expect(Number(rows[0].best_score)).toBe(5000);
  });

  it('returns my rank', async () => {
    const [r] = await as<{ rank: number }>('authenticated', B, 'select * from public.get_my_rank()');
    expect(Number(r.rank)).toBe(2);
  });

  it('keeps the best score when a worse run is submitted', async () => {
    await db.exec(`update public.runs set created_at = now() - interval '1 minute'`);
    const [r] = await as<{ submit_run: { best_score: number; is_best: boolean } }>('authenticated', A, 'select public.submit_run(100, 60, 5, 10000, $1)', ['rio']);
    expect(r.submit_run.best_score).toBe(5000);
    expect(r.submit_run.is_best).toBe(false);
  });
});

describe('row level security', () => {
  it('blocks direct writes to stats and runs', async () => {
    await expectError(as('authenticated', A, 'update public.player_stats set best_score = 99999999 where user_id = $1', [A]), /permission denied/);
    await expectError(as('authenticated', A, `insert into public.runs (user_id, score, distance, coins, duration_ms, character) values ($1, 1, 1, 1, 1, 'x')`, [A]), /permission denied/);
  });

  it('lets users update only their own profile', async () => {
    await as('authenticated', A, `update public.profiles set avatar = '🐯' where id = $1`, [A]);
    const updated = await as('authenticated', A, `update public.profiles set avatar = '🐯' where id = $1 returning id`, [B]);
    expect(updated).toHaveLength(0);
    const [b] = await db.query<{ avatar: string }>('select avatar from public.profiles where id = $1', [B]).then((r) => r.rows);
    expect(b.avatar).toBe('🦊');
    await expectError(as('authenticated', A, `update public.profiles set id = $2 where id = $1`, [A, C]), /permission denied/);
  });

  it('keeps progress private', async () => {
    await as('authenticated', A, `update public.player_progress set data = '{"coins": 42}' where user_id = $1`, [A]);
    const mine = await as<{ data: { coins: number } }>('authenticated', A, 'select data from public.player_progress');
    expect(mine).toHaveLength(1);
    expect(mine[0].data.coins).toBe(42);
    const theirs = await as('authenticated', B, 'select data from public.player_progress where user_id = $1', [A]);
    expect(theirs).toHaveLength(0);
    const anon = as('anon', null, 'select data from public.player_progress');
    await expectError(anon, /permission denied/);
  });

  it('runs are only visible to their owner', async () => {
    const mine = await as('authenticated', B, 'select * from public.runs');
    expect(mine.length).toBe(1);
  });
});

describe('friends', () => {
  it('adds a friend by username (case-insensitive) and builds a friends leaderboard', async () => {
    const [r] = await as<{ add_friend: { username: string } }>('authenticated', B, 'select public.add_friend($1)', ['ALICE']);
    expect(r.add_friend.username).toBe('Alice');
    const board = await as<{ username: string; is_me: boolean; mutual: boolean }>('authenticated', B, 'select * from public.get_friends_leaderboard()');
    expect(board.map((x) => x.username)).toEqual(['Alice', 'bob']);
    expect(board.find((x) => x.username === 'bob')?.is_me).toBe(true);
    expect(board.find((x) => x.username === 'Alice')?.mutual).toBe(false);
  });

  it('rejects unknown players and self-adds', async () => {
    await expectError(as('authenticated', B, 'select public.add_friend($1)', ['nobody_here']), /player not found/);
    await expectError(as('authenticated', B, 'select public.add_friend($1)', ['bob']), /cannot add yourself/);
  });

  it('cannot create friendships on behalf of others', async () => {
    await expectError(as('authenticated', A, 'insert into public.friendships (user_id, friend_id) values ($1, $2)', [B, C]), /row-level security/);
  });

  it('can remove a friend', async () => {
    await as('authenticated', B, 'delete from public.friendships where friend_id = $1', [A]);
    const board = await as('authenticated', B, 'select * from public.get_friends_leaderboard()');
    expect(board).toHaveLength(1);
  });

  it('reports username availability', async () => {
    const [r] = await as<{ username_available: boolean }>('anon', null, 'select public.username_available($1)', ['alice']);
    expect(r.username_available).toBe(false);
    const [r2] = await as<{ username_available: boolean }>('anon', null, 'select public.username_available($1)', ['zed_runner']);
    expect(r2.username_available).toBe(true);
  });
});
