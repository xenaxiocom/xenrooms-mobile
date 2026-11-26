// What the screens decide without React Native, so it can be tested.
import type { Room } from './matrix/client';
import type { Mention } from './matrix/format';

/** What a room's red mark counts: mentions in a channel, every unread message in a conversation. */
export function badgeOf(room: Pick<Room, 'kind' | 'notifications' | 'highlights'>): number {
  return room.kind === 'dm' ? room.notifications : room.highlights;
}

/** The people "@" offers: members who joined, without oneself, matching the typed part. */
export function mentionCandidates(room: Pick<Room, 'members'>, me: string, query: string, limit = 5): Mention[] {
  const q = query.toLowerCase();
  return [...room.members.values()]
    .filter((m) => m.membership === 'join' && m.userId !== me && (m.displayName.toLowerCase().includes(q) || m.userId.toLowerCase().includes(q)))
    .slice(0, limit)
    .map((m) => ({ userId: m.userId, displayName: m.displayName }));
}

/** Who is typing, as the web client says it. */
export function typingText(names: string[], t: (key: string, params?: Record<string, string>) => string): string | null {
  if (names.length === 0) return null;
  if (names.length === 1) return t('chat.typing_one', { name: names[0] as string });
  if (names.length === 2) return t('chat.typing_two', { a: names[0] as string, b: names[1] as string });
  return t('chat.typing_many');
}
