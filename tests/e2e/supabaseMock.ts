import type { Page, Route } from '@playwright/test';

/**
 * In-memory stand-in for the Supabase HTTP API (GoTrue + PostgREST RPCs), used
 * only by the E2E tests so the real client code paths (auth, score submission,
 * leaderboards, friends, cloud save) can be exercised in a browser without a
 * live project. The SQL behind these endpoints is tested separately on real
 * Postgres in tests/unit/database.test.ts.
 */
export class SupabaseMock {
  users = new Map<string, { id: string; email: string; password: string; username: string; avatar: string }>();
  stats = new Map<string, { best_score: number; best_distance: number }>();
  progress = new Map<string, unknown>();
  friends = new Set<string>();
  calls: { path: string; body: unknown; auth: string | null }[] = [];
  private seq = 0;

  constructor() {
    // Pre-existing players so the leaderboard has content.
    this.addUser('neo_runner', '🤖', 9000, 2100);
    this.addUser('skyline', '🦊', 4200, 1300);
  }

  addUser(username: string, avatar: string, best: number, dist: number): string {
    const id = `00000000-0000-4000-8000-${String(++this.seq).padStart(12, '0')}`;
    this.users.set(id, { id, email: `${username}@example.com`, password: 'x', username, avatar });
    this.stats.set(id, { best_score: best, best_distance: dist });
    return id;
  }

  private session(id: string) {
    const u = this.users.get(id)!;
    const now = Math.floor(Date.now() / 1000);
    return {
      access_token: `token-${id}`,
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: now + 3600,
      refresh_token: `refresh-${id}`,
      user: { id, aud: 'authenticated', role: 'authenticated', email: u.email, user_metadata: { username: u.username }, app_metadata: {}, created_at: new Date().toISOString() },
    };
  }

  private board() {
    return [...this.stats.entries()]
      .filter(([, s]) => s.best_score > 0)
      .sort((a, b) => b[1].best_score - a[1].best_score)
      .map(([id, s], i) => ({ rank: i + 1, user_id: id, username: this.users.get(id)!.username, avatar: this.users.get(id)!.avatar, best_score: s.best_score, best_distance: s.best_distance }));
  }

  async install(page: Page): Promise<void> {
    await page.routeWebSocket(/supabase\.mock/, () => {
      /* realtime: accept and stay silent */
    });
    await page.route('http://supabase.mock/**', (route) => this.handle(route));
  }

  private json(route: Route, body: unknown, status = 200) {
    return route.fulfill({ status, contentType: 'application/json', body: body === undefined ? '' : JSON.stringify(body), headers: { 'access-control-allow-origin': '*' } });
  }

  private async handle(route: Route) {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
    const url = new URL(req.url());
    const auth = req.headers()['authorization'] ?? null;
    const uid = auth?.startsWith('Bearer token-') ? auth.slice('Bearer token-'.length) : null;
    let body: Record<string, unknown> = {};
    try {
      body = req.postDataJSON() ?? {};
    } catch {
      body = {};
    }
    this.calls.push({ path: `${req.method()} ${url.pathname}`, body, auth: uid });
    const p = url.pathname;

    if (p === '/auth/v1/signup') {
      const meta = (body.data ?? {}) as { username: string; avatar: string };
      const id = `00000000-0000-4000-8000-${String(++this.seq).padStart(12, '0')}`;
      this.users.set(id, { id, email: String(body.email), password: String(body.password), username: meta.username, avatar: meta.avatar });
      this.stats.set(id, { best_score: 0, best_distance: 0 });
      return this.json(route, this.session(id));
    }
    if (p === '/auth/v1/token') {
      const u = [...this.users.values()].find((x) => x.email === body.email && x.password === body.password);
      if (!u) return this.json(route, { code: 400, error_code: 'invalid_credentials', msg: 'Invalid login credentials' }, 400);
      return this.json(route, this.session(u.id));
    }
    if (p === '/auth/v1/logout') return route.fulfill({ status: 204 });
    if (p === '/auth/v1/user') return uid ? this.json(route, this.session(uid).user) : this.json(route, { msg: 'no' }, 401);

    if (p.startsWith('/rest/v1/rpc/')) {
      const fn = p.slice('/rest/v1/rpc/'.length);
      switch (fn) {
        case 'username_available':
          return this.json(route, ![...this.users.values()].some((u) => u.username.toLowerCase() === String(body.p_username).toLowerCase()));
        case 'get_leaderboard':
          return this.json(route, this.board().slice(0, Number(body.p_limit ?? 100)));
        case 'get_my_rank': {
          const row = this.board().find((r) => r.user_id === uid);
          return this.json(route, row ? [{ rank: row.rank, best_score: row.best_score, best_distance: row.best_distance }] : []);
        }
        case 'submit_run': {
          if (!uid) return this.json(route, { message: 'not authenticated' }, 401);
          const s = this.stats.get(uid)!;
          const prev = s.best_score;
          s.best_score = Math.max(prev, Number(body.p_score));
          s.best_distance = Math.max(s.best_distance, Number(body.p_distance));
          const rank = this.board().findIndex((r) => r.user_id === uid) + 1;
          return this.json(route, { best_score: s.best_score, is_best: Number(body.p_score) > prev, rank });
        }
        case 'add_friend': {
          const f = [...this.users.values()].find((u) => u.username.toLowerCase() === String(body.p_username).toLowerCase());
          if (!f) return this.json(route, { code: 'P0002', message: 'player not found' }, 400);
          this.friends.add(f.id);
          return this.json(route, { id: f.id, username: f.username });
        }
        case 'get_friends_leaderboard': {
          const ids = [uid!, ...this.friends];
          return this.json(
            route,
            ids
              .map((id) => ({ id, s: this.stats.get(id)! }))
              .sort((a, b) => b.s.best_score - a.s.best_score)
              .map(({ id, s }, i) => ({ rank: i + 1, user_id: id, username: this.users.get(id)!.username, avatar: this.users.get(id)!.avatar, best_score: s.best_score, best_distance: s.best_distance, is_me: id === uid, mutual: false })),
          );
        }
      }
    }
    if (p === '/rest/v1/profiles') {
      const id = url.searchParams.get('id')?.replace('eq.', '') ?? '';
      const u = this.users.get(id);
      const row = u ? { id: u.id, username: u.username, avatar: u.avatar } : null;
      if (req.method() === 'PATCH' && u) {
        Object.assign(u, body);
        return this.json(route, { id: u.id, username: u.username, avatar: u.avatar });
      }
      const wantsObject = (req.headers()['accept'] ?? '').includes('vnd.pgrst.object');
      return this.json(route, wantsObject ? row : row ? [row] : []);
    }
    if (p === '/rest/v1/player_progress') {
      if (req.method() === 'GET') {
        const data = uid ? this.progress.get(uid) : undefined;
        return this.json(route, data ? [{ data }] : []);
      }
      if (uid) this.progress.set(uid, body.data);
      return route.fulfill({ status: 201, body: '' });
    }
    if (p === '/rest/v1/friendships' && req.method() === 'DELETE') {
      this.friends.delete(url.searchParams.get('friend_id')?.replace('eq.', '') ?? '');
      return route.fulfill({ status: 204 });
    }
    return this.json(route, { message: `unmocked ${req.method()} ${p}` }, 404);
  }
}
