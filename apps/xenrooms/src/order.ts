// The order of the companies in the rail, kept on the platform (rule 10; owner 24.11.2026):
// in the settings document (step 64), key `xenroomsCompanyOrder`: `{ order: [user ids], at }`.
// The app writes it into every account's document, the browser (xenrooms.app) into the
// active account's (lib/xenaxio/company-order.ts there); whoever reads takes the newest.
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

export interface StoredOrder {
  order: string[];
  at: number;
}

/** The stored value, or null; a bare list (older writers) counts as oldest. */
export function parseOrder(value: unknown): StoredOrder | null {
  if (Array.isArray(value)) return value.every((x) => typeof x === 'string') ? { order: value as string[], at: 0 } : null;
  if (!value || typeof value !== 'object') return null;
  const v = value as { order?: unknown; at?: unknown };
  if (!Array.isArray(v.order) || !v.order.every((x) => typeof x === 'string')) return null;
  return { order: v.order as string[], at: typeof v.at === 'number' && Number.isFinite(v.at) ? v.at : 0 };
}

/** The newest order stored in any of the accounts' documents. */
export async function readOrder(accounts: Account[]): Promise<string[]> {
  const found = await Promise.all(
    accounts.map(async (a) => parseOrder((await roomsApi<{ settings: Record<string, unknown> | null }>(host(a), '/settings').catch(() => null))?.settings?.[ORDER_KEY])),
  );
  return found.reduce<StoredOrder | null>((best, x) => (x && (!best || x.at > best.at) ? x : best), null)?.order ?? [];
}

/** Writes the order into every account's settings document, leaving the rest of it as it is. */
export async function writeOrder(accounts: Account[], order: string[], at = Date.now()): Promise<void> {
  await Promise.all(
    accounts.map(async (a) => {
      const doc = await roomsApi<{ settings: Record<string, unknown> | null }>(host(a), '/settings').catch(() => null);
      if (!doc) return;
      const settings = { ...(doc.settings ?? {}), [ORDER_KEY]: { order, at } };
      await roomsApi(host(a), '/settings', { method: 'POST', body: { username: a.email, serverUrl: a.origin, settings } }).catch(() => undefined);
    }),
  );
}
