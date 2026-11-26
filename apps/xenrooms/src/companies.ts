// The companies of this phone and the open one; one chat client per company, kept in memory,
// so switching is instant (only the open company syncs; the others' counts are asked every
// 30 seconds while the app is in front).
import { ChatClient, createTransport, roomsApi } from '@xenaxio/rooms-native';
import { AppState } from 'react-native';
import { create } from 'zustand';
import { type Account, mergeAccounts } from './account';
import { moved, readOrder, sortByOrder, writeOrder } from './order';
import { signOut } from './signin';
import { loadAccounts, saveAccounts } from './storage';

export const COUNTS_EVERY_MS = 30_000;

interface Companies {
  loaded: boolean;
  accounts: Account[];
  activeId: string | null;
  /** Unread mentions and direct messages of the companies not open now. */
  counts: Record<string, number>;
  load: () => Promise<void>;
  add: (accounts: Account[]) => Promise<void>;
  open: (userId: string) => Promise<void>;
  move: (userId: string, by: -1 | 1) => Promise<void>;
  leave: (userId: string) => Promise<void>;
}

const clients = new Map<string, ChatClient>();

/** The company's chat client (made once, started while the company is open). */
export function clientOf(account: Account): ChatClient {
  let client = clients.get(account.userId);
  if (!client) {
    client = new ChatClient(createTransport({ origin: account.origin, token: account.token }));
    clients.set(account.userId, client);
  }
  return client;
}

function startOnly(activeId: string | null, accounts: Account[]) {
  for (const a of accounts) {
    const c = clientOf(a);
    if (a.userId === activeId) void c.start().catch(() => undefined);
    else c.stop();
  }
}

export const useCompanies = create<Companies>((set, get) => ({
  loaded: false,
  accounts: [],
  activeId: null,
  counts: {},

  load: async () => {
    const stored = await loadAccounts().catch(() => ({ accounts: [] as Account[], active: null }));
    const order = stored.accounts.length ? await readOrder(stored.accounts) : [];
    const accounts = sortByOrder(stored.accounts, order);
    const activeId = accounts.some((a) => a.userId === stored.active) ? stored.active : (accounts[0]?.userId ?? null);
    set({ loaded: true, accounts, activeId });
    startOnly(activeId, accounts);
  },

  add: async (added) => {
    const accounts = mergeAccounts(get().accounts, added);
    const activeId = added[0]?.userId ?? get().activeId;
    for (const a of added) {
      clients.get(a.userId)?.stop();
      clients.delete(a.userId);
    }
    set({ accounts, activeId });
    await saveAccounts(accounts, activeId);
    startOnly(activeId, accounts);
    void writeOrder(accounts, accounts.map((a) => a.userId));
  },

  open: async (userId) => {
    if (!get().accounts.some((a) => a.userId === userId)) return;
    set({ activeId: userId });
    startOnly(userId, get().accounts);
    await saveAccounts(get().accounts, userId);
  },

  move: async (userId, by) => {
    const ids = moved(get().accounts.map((a) => a.userId), userId, by);
    const accounts = sortByOrder(get().accounts, ids);
    set({ accounts });
    await saveAccounts(accounts, get().activeId);
    await writeOrder(accounts, ids);
  },

  leave: async (userId) => {
    const account = get().accounts.find((a) => a.userId === userId);
    if (!account) return;
    clients.get(userId)?.stop();
    clients.delete(userId);
    await signOut(account);
    const accounts = get().accounts.filter((a) => a.userId !== userId);
    const activeId = get().activeId === userId ? (accounts[0]?.userId ?? null) : get().activeId;
    const { [userId]: _gone, ...counts } = get().counts;
    set({ accounts, activeId, counts });
    await saveAccounts(accounts, activeId);
    startOnly(activeId, accounts);
    void writeOrder(accounts, accounts.map((a) => a.userId));
  },
}));

/** Asks the inactive companies' counts now and every 30 seconds while the app is in front. */
export function watchCounts(): () => void {
  const tick = async () => {
    if (AppState.currentState !== 'active') return;
    const { accounts, activeId } = useCompanies.getState();
    const counts: Record<string, number> = {};
    await Promise.all(
      accounts
        .filter((a) => a.userId !== activeId)
        .map(async (a) => {
          const r = await roomsApi<{ important: number }>({ origin: a.origin, token: a.token }, '/chat/unread').catch(() => null);
          counts[a.userId] = r?.important ?? 0;
        }),
    );
    useCompanies.setState({ counts });
  };
  void tick();
  const timer = setInterval(() => void tick(), COUNTS_EVERY_MS);
  const sub = AppState.addEventListener('change', (s) => s === 'active' && void tick());
  return () => {
    clearInterval(timer);
    sub.remove();
  };
}
