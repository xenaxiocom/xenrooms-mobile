// Step 152 R1: the app's own logic without native modules.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const settings = vi.hoisted(() => ({ docs: new Map<string, Record<string, unknown> | null>(), posted: [] as { token: string; body: unknown }[] }));
vi.mock('@xenaxio/rooms-native', () => ({
  roomsApi: async (host: { token: string }, path: string, init: { method?: string; body?: unknown } = {}) => {
    if (path !== '/settings') throw new Error(path);
    if (init.method === 'POST') {
      settings.posted.push({ token: host.token, body: init.body });
      return { ok: true };
    }
    return { settings: settings.docs.get(host.token) ?? null };
  },
}));

const { accountsFromToken, mergeAccounts } = await import('../src/account');
const { authorizeUrl, base64url, normalizeAddress, readCallback } = await import('../src/signin-core');
const { moved, ORDER_KEY, readOrder, sortByOrder, writeOrder } = await import('../src/order');
const { badgeTotal, targetOf } = await import('../src/notify');

const answer = {
  token: 't1',
  origin: 'https://xenrooms.app',
  user: { id: 'u1', email: 'max@acme.de', displayName: 'Max' },
  tenant: { name: 'Acme' },
  accounts: [
    { token: 't1', expiresAt: '2027-11-26T00:00:00Z', origin: 'https://xenrooms.app', user: { id: 'u1', email: 'max@acme.de', displayName: 'Max' }, tenant: { name: 'Acme' }, portal: { name: 'Acme', color: '#0f766e', colorText: null, logoUrl: '/api/portal/logo?v=1', iconUrl: null, iconBackground: null } },
    { token: 't2', expiresAt: '2027-11-26T00:00:00Z', origin: 'https://xenrooms.app/', user: { id: 'u2', email: 'eva@beta.de', displayName: 'Eva' }, tenant: { name: 'Beta' }, portal: null },
  ],
};

describe('sign-in', () => {
  it('builds the platform request and reads only its own answer', () => {
    const url = new URL(authorizeUrl('https://xenrooms.app', { challenge: 'c'.repeat(43), state: 's1', add: true, have: ['u1', 'u2'] }));
    expect(url.pathname).toBe('/api/mobile/authorize');
    expect(Object.fromEntries(url.searchParams)).toEqual({ redirect_uri: 'xenrooms://auth/callback', state: 's1', code_challenge: 'c'.repeat(43), code_challenge_method: 'S256', prompt: 'add', have: 'u1,u2' });
    expect(readCallback('xenrooms://auth/callback?code=abc&state=s1&origin=https%3A%2F%2Fxenrooms.app', 's1', 'https://xenrooms.app')).toEqual({ code: 'abc', origin: 'https://xenrooms.app' });
    expect(readCallback('xenrooms://auth/callback?code=abc&state=other', 's1', 'https://xenrooms.app')).toEqual({ error: 'state' });
    expect(readCallback('xenrooms://auth/callback?error=access_denied&state=s1', 's1', 'https://xenrooms.app')).toEqual({ error: 'denied' });
    expect(readCallback('xenrooms://auth/callback?code=abc&state=s1&origin=https%3A%2F%2Fevil.example', 's1', 'https://xenrooms.app')).toEqual({ error: 'invalid' });
    expect(readCallback(null, 's1', 'https://xenrooms.app')).toEqual({ error: 'cancelled' });
  });

  it('own addresses: https only', () => {
    expect(normalizeAddress('chat.acme.de/')).toBe('https://chat.acme.de');
    expect(normalizeAddress('http://chat.acme.de')).toBeNull();
    expect(normalizeAddress('localhost')).toBeNull();
    expect(base64url(new Uint8Array([251, 255, 0]))).toBe('-_8A');
  });

  it('one company per account of the answer; a company signed in again replaces its entry', () => {
    const accounts = accountsFromToken(answer);
    expect(accounts.map((a) => [a.userId, a.company, a.origin])).toEqual([
      ['u1', 'Acme', 'https://xenrooms.app'],
      ['u2', 'Beta', 'https://xenrooms.app'],
    ]);
    expect(accounts[0]?.portal?.logoUrl).toBe('/api/portal/logo?v=1');
    // An older platform answers one company at the top level.
    expect(accountsFromToken({ ...answer, accounts: undefined }).map((a) => a.userId)).toEqual(['u1']);
    const again = mergeAccounts(accounts, [{ ...(accounts[1] as (typeof accounts)[number]), token: 't3' }]);
    expect(again.map((a) => a.token)).toEqual(['t1', 't3']);
  });
});

describe('company order on the platform (rule 10)', () => {
  beforeEach(() => {
    settings.docs.clear();
    settings.posted = [];
  });

  it('sorts by the stored order and moves one company', () => {
    const list = [{ userId: 'a' }, { userId: 'b' }, { userId: 'c' }];
    expect(sortByOrder(list, ['c', 'a']).map((x) => x.userId)).toEqual(['c', 'a', 'b']);
    expect(moved(['a', 'b', 'c'], 'b', -1)).toEqual(['b', 'a', 'c']);
    expect(moved(['a', 'b', 'c'], 'a', -1)).toEqual(['a', 'b', 'c']);
  });

  it('reads the newest stored order and writes it into every account, keeping the rest of the document', async () => {
    const accounts = accountsFromToken(answer);
    // The browser changed it in one company's document after the phone wrote both.
    settings.docs.set('t1', { theme: 'dark', [ORDER_KEY]: { order: ['u1', 'u2'], at: 100 } });
    settings.docs.set('t2', { [ORDER_KEY]: { order: ['u2', 'u1'], at: 200 }, locale: 'de' });
    expect(await readOrder(accounts)).toEqual(['u2', 'u1']);
    settings.docs.set('t2', { [ORDER_KEY]: ['u2', 'u1'], locale: 'de' });
    expect(await readOrder(accounts)).toEqual(['u1', 'u2']);
    await writeOrder(accounts, ['u1', 'u2'], 300);
    expect(settings.posted).toEqual([
      { token: 't1', body: { username: 'max@acme.de', serverUrl: 'https://xenrooms.app', settings: { theme: 'dark', [ORDER_KEY]: { order: ['u1', 'u2'], at: 300 } } } },
      { token: 't2', body: { username: 'eva@beta.de', serverUrl: 'https://xenrooms.app', settings: { locale: 'de', [ORDER_KEY]: { order: ['u1', 'u2'], at: 300 } } } },
    ]);
  });
});

describe('notifications', () => {
  it('a tap opens the company and room it names', () => {
    expect(targetOf({ kind: 'xenaxio-chat', roomId: '!r:acme.de', account: 'u2' })).toEqual({ account: 'u2', roomId: '!r:acme.de' });
    expect(targetOf({ kind: 'jmap-email-push', emailId: 'm1' })).toBeNull();
    expect(targetOf({ kind: 'xenaxio-chat', roomId: 'x' })).toBeNull();
    expect(badgeTotal(2, { u2: 3, u3: 0 })).toBe(5);
  });
});
