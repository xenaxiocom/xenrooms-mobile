// One company on this phone: what POST /api/mobile/token answered for it (step 152 R1a).
export interface Account {
  userId: string;
  email: string;
  displayName: string;
  company: string;
  /** The address the API is on (https://xenrooms.app); `/api` below it. */
  origin: string;
  /** The device token of this company (a platform session). */
  token: string;
  expiresAt: string;
  portal: { color: string | null; colorText: string | null; logoUrl: string | null; iconBackground: string | null } | null;
}

/** The token answer's `accounts` (older platforms: the top-level fields only) as accounts. */
export function accountsFromToken(body: unknown): Account[] {
  const b = (body ?? {}) as Record<string, unknown>;
  const list = Array.isArray(b.accounts) ? (b.accounts as Record<string, unknown>[]) : [b];
  const out: Account[] = [];
  for (const a of list) {
    const user = (a.user ?? {}) as Record<string, unknown>;
    const tenant = (a.tenant ?? {}) as Record<string, unknown>;
    const portal = a.portal && typeof a.portal === 'object' ? (a.portal as Record<string, unknown>) : null;
    const str = (v: unknown) => (typeof v === 'string' ? v : null);
    if (typeof a.token !== 'string' || typeof a.origin !== 'string' || typeof user.id !== 'string') continue;
    out.push({
      userId: user.id,
      email: str(user.email) ?? '',
      displayName: str(user.displayName) ?? '',
      company: str(tenant.name) ?? '',
      origin: a.origin.replace(/\/+$/, ''),
      token: a.token,
      expiresAt: str(a.expiresAt) ?? '',
      portal: portal ? { color: str(portal.color), colorText: str(portal.colorText), logoUrl: str(portal.logoUrl), iconBackground: str(portal.iconBackground) } : null,
    });
  }
  return out;
}

/** The accounts after a sign-in: new ones added, a company signed in again replaced (same person). */
export function mergeAccounts(current: Account[], added: Account[]): Account[] {
  const byId = new Map(current.map((a) => [a.userId, a]));
  for (const a of added) byId.set(a.userId, a);
  return [...byId.values()];
}
