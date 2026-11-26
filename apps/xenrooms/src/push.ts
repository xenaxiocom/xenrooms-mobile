// Notifications from the platform (step 151 B, step 152 R1a): the phone's FCM (Android) or
// APNs (iPhone) token goes to every company with `app: rooms`; a tap opens the company and
// the room; the icon shows the total.
import { roomsApi } from '@xenaxio/rooms-native';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { Account } from './account';
import { type NotificationTarget, targetOf } from './notify';

Notifications.setNotificationHandler({
  // While the app is open the conversation shows the message itself.
  handleNotification: async () => ({ shouldShowBanner: false, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: true }),
});

/** Registers this phone for every company; false when the person did not allow notifications. */
export async function registerPush(accounts: Account[]): Promise<boolean> {
  const permission = await Notifications.requestPermissionsAsync().catch(() => null);
  if (!permission?.granted) return false;
  const device = await Notifications.getDevicePushTokenAsync().catch(() => null);
  if (!device || typeof device.data !== 'string') return false;
  const transport = Platform.OS === 'ios' ? 'apns' : 'fcm';
  await Promise.all(
    accounts.map(async (a) => {
      const host = { origin: a.origin, token: a.token };
      const offered = await roomsApi<{ transports: string[] }>(host, '/mobile/push').catch(() => ({ transports: [] as string[] }));
      if (!offered.transports.includes(transport)) return;
      await roomsApi(host, '/mobile/push', { body: { transport, token: device.data, app: 'rooms' } }).catch(() => undefined);
    }),
  );
  return true;
}

/** Calls `open` for the notification that started the app and for every later tap. */
export function onNotificationTap(open: (target: NotificationTarget) => void): () => void {
  const handle = (response: Notifications.NotificationResponse | null) => {
    const target = targetOf(response?.notification.request.content.data);
    if (target) open(target);
  };
  void Notifications.getLastNotificationResponseAsync().then(handle, () => undefined);
  const sub = Notifications.addNotificationResponseReceivedListener(handle);
  return () => sub.remove();
}

export function setBadge(count: number): void {
  void Notifications.setBadgeCountAsync(count).catch(() => undefined);
}
