// What a tapped notification opens: the company (the notice's `account`, step 152 R1a) and
// the room. On an iPhone expo-notifications hands over the APNs payload's `body`; on Android
// the FCM data map. Anything else opens the app only.
export interface NotificationTarget {
  account: string | null;
  roomId: string;
}

export function targetOf(data: unknown): NotificationTarget | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  if (d.kind !== 'xenaxio-chat' || typeof d.roomId !== 'string' || !d.roomId.startsWith('!')) return null;
  return { account: typeof d.account === 'string' ? d.account : null, roomId: d.roomId };
}

/** The number on the app icon: the active company's mentions and direct messages, plus the others'. */
export function badgeTotal(active: number, others: Record<string, number>): number {
  return active + Object.values(others).reduce((n, x) => n + x, 0);
}
