// The order of the companies in the rail, kept on the platform (rule 10; owner 24.11.2026):
// in the settings document (step 64) of every account, key `xenroomsCompanyOrder`, a list of
// user ids. The web client (xenrooms.app) reads the same key.
import { roomsApi } from '@xenaxio/rooms-native';
import type { Account } from './account';

export const ORDER_KEY = 'xenroomsCompanyOrder';

/** Accounts in the stored order; those not in it keep their place at the end. */
export function sortByOrder<T extends { userId: string }>(accounts: T[], order: string[]): T[] {
  const rank = new Map(order.map((id, i) => [id, i]));
  return accounts
    .map((a, i) => ({ a, i }))
    .sort((x, y) => (rank.get(x.a.userId) ?? order.length + x.i) - (rank.get(y.a.userId) ?? order.length + y.i))
    .map((x) => x.a);
}

/** The order with one company moved up (-1) or down (+1). */
export function moved(ids: string[], userId: string, by: -1 | 1): string[] {
  const i = ids.indexOf(userId);
  const j = i + by;
  if (i < 0 || j < 0 || j >= ids.length) return ids;
  const next = [...ids];
  [next[i], next[j]] = [next[j] as string, next[i] as string];
  return next;
}

const host = (a: Account) => ({ origin: a.origin, token: a.token });

/** The stored order, from the first account that has one. */
export async function readOrder(accounts: Account[]): Promise<string[]> {
  for (const a of accounts) {
    const doc = await roomsApi<{ settings: Record<string, unknown> | null }>(host(a), '/settings').catch(() => null);
    const order = doc?.settings?.[ORDER_KEY];
    if (Array.isArray(order) && order.every((x) => typeof x === 'string')) return order as string[];
  }
  return [];
}

/** Writes the order into every account's settings document, leaving the rest of it as it is. */
export async function writeOrder(accounts: Account[], order: string[]): Promise<void> {
  await Promise.all(
    accounts.map(async (a) => {
      const doc = await roomsApi<{ settings: Record<string, unknown> | null }>(host(a), '/settings').catch(() => null);
      if (!doc) return;
      const settings = { ...(doc.settings ?? {}), [ORDER_KEY]: order };
      await roomsApi(host(a), '/settings', { method: 'POST', body: { username: a.email, serverUrl: a.origin, settings } }).catch(() => undefined);
    }),
  );
}
