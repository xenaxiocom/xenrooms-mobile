// The phone's sign-in through the platform (step 151 A, step 152 R1a): the system browser
// opens /api/mobile/authorize with PKCE; the platform sends the app's own link back with a
// one-time code. Only the parts without native modules, so they can be tested.

/** The app's own link; the platform hands codes to nothing else. */
export const REDIRECT_URI = 'xenrooms://auth/callback';
/** Where XenRooms signs in unless the person gives the address of their own server. */
export const DEFAULT_ADDRESS = 'https://xenrooms.app';

/** bytes → base64url without padding (RFC 7636). */
export function base64url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** "acme.de" or "https://chat.acme.de/" → "https://chat.acme.de"; https only. */
export function normalizeAddress(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw.includes('://') ? raw : `https://${raw}`);
    if (url.protocol !== 'https:' || !url.hostname.includes('.')) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function authorizeUrl(origin: string, p: { challenge: string; state: string; add?: boolean; have?: string[] }): string {
  const q = new URLSearchParams({ redirect_uri: REDIRECT_URI, state: p.state, code_challenge: p.challenge, code_challenge_method: 'S256' });
  if (p.add) q.set('prompt', 'add');
  if (p.have?.length) q.set('have', p.have.join(','));
  return `${origin}/api/mobile/authorize?${q.toString()}`;
}

export type Callback = { code: string; origin: string } | { error: 'cancelled' | 'denied' | 'state' | 'invalid' };

/** The app's link coming back: the code for this sign-in, or why there is none. */
export function readCallback(url: string | null, state: string, origin: string): Callback {
  if (!url) return { error: 'cancelled' };
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { error: 'invalid' };
  }
  if (`${parsed.protocol}//${parsed.host}${parsed.pathname}` !== REDIRECT_URI) return { error: 'invalid' };
  if (parsed.searchParams.get('state') !== state) return { error: 'state' };
  if (parsed.searchParams.get('error')) return { error: 'denied' };
  const code = parsed.searchParams.get('code');
  if (!code) return { error: 'invalid' };
  // The platform says where it is; it must be the address the sign-in was started on.
  const back = parsed.searchParams.get('origin');
  if (back && back.replace(/\/+$/, '') !== origin) return { error: 'invalid' };
  return { code, origin };
}
