// Signing in through the phone's browser: PKCE, the platform's page, the code exchanged for
// the companies' device tokens.
import * as Crypto from 'expo-crypto';
import * as Device from 'expo-device';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { type Account, accountsFromToken } from './account';
import { authorizeUrl, base64url, readCallback, REDIRECT_URI } from './signin-core';

export class SignInError extends Error {
  constructor(readonly reason: 'cancelled' | 'denied' | 'failed') {
    super(`signin_${reason}`);
    this.name = 'SignInError';
  }
}

/** Opens the platform's sign-in; `add` signs in to one more company, `have` are those already here. */
export async function signIn(origin: string, opts: { add?: boolean; have?: string[] } = {}): Promise<Account[]> {
  const verifier = base64url(Crypto.getRandomBytes(48));
  const challenge = base64url(new Uint8Array(await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, new TextEncoder().encode(verifier))));
  const state = base64url(Crypto.getRandomBytes(16));
  const result = await WebBrowser.openAuthSessionAsync(authorizeUrl(origin, { challenge, state, ...opts }), REDIRECT_URI);
  const back = readCallback(result.type === 'success' ? result.url : null, state, origin);
  if ('error' in back) throw new SignInError(back.error === 'cancelled' ? 'cancelled' : back.error === 'denied' ? 'denied' : 'failed');
  const res = await fetch(`${origin}/api/mobile/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      code: back.code,
      code_verifier: verifier,
      device_name: (Device.deviceName ?? Device.modelName ?? (Platform.OS === 'ios' ? 'iPhone' : 'Android')).slice(0, 100),
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
    }),
  }).catch(() => null);
  if (!res?.ok) throw new SignInError('failed');
  const accounts = accountsFromToken(await res.json());
  if (!accounts.length) throw new SignInError('failed');
  return accounts;
}

/** Signs one company out on the platform (its token and push end there). Best effort. */
export async function signOut(account: Account): Promise<void> {
  await fetch(`${account.origin}/api/mobile/logout`, { method: 'POST', headers: { Authorization: `Bearer ${account.token}` } }).catch(() => undefined);
}
