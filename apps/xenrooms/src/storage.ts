// The companies on this phone, with their tokens, in the system's secure storage (Keychain,
// Android Keystore): one entry per company plus the list, so no entry grows with the count.
import * as SecureStore from 'expo-secure-store';
import type { Account } from './account';

const INDEX = 'xenrooms.accounts';
const ACTIVE = 'xenrooms.active';
const entry = (userId: string) => `xenrooms.account.${userId}`;

export async function loadAccounts(): Promise<{ accounts: Account[]; active: string | null }> {
  const ids = JSON.parse((await SecureStore.getItemAsync(INDEX)) ?? '[]') as string[];
  const accounts: Account[] = [];
  for (const id of ids) {
    const raw = await SecureStore.getItemAsync(entry(id));
    if (raw) accounts.push(JSON.parse(raw) as Account);
  }
  return { accounts, active: await SecureStore.getItemAsync(ACTIVE) };
}

export async function saveAccounts(accounts: Account[], active: string | null): Promise<void> {
  const before = JSON.parse((await SecureStore.getItemAsync(INDEX)) ?? '[]') as string[];
  for (const a of accounts) await SecureStore.setItemAsync(entry(a.userId), JSON.stringify(a));
  for (const id of before) if (!accounts.some((a) => a.userId === id)) await SecureStore.deleteItemAsync(entry(id));
  await SecureStore.setItemAsync(INDEX, JSON.stringify(accounts.map((a) => a.userId)));
  if (active) await SecureStore.setItemAsync(ACTIVE, active);
  else await SecureStore.deleteItemAsync(ACTIVE);
}
