import { useIsFocused } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Conversation } from '@xenaxio/rooms-native';
import { useLayoutEffect } from 'react';
import { clientOf, useCompanies } from '../companies';
import type { Stack } from '../navigation';

export function RoomScreen({ route, navigation }: NativeStackScreenProps<Stack, 'Room'>) {
  const account = useCompanies((s) => s.accounts.find((a) => a.userId === s.activeId));
  const focused = useIsFocused();
  const client = account ? clientOf(account) : null;
  const room = client?.rooms.get(route.params.roomId);

  useLayoutEffect(() => {
    if (client && room) navigation.setOptions({ title: room.kind === 'channel' ? `# ${client.roomName(room)}` : client.roomName(room) });
  }, [client, room, navigation]);

  if (!account || !client) return null;
  return <Conversation client={client} host={{ origin: account.origin, token: account.token }} roomId={route.params.roomId} active={focused} />;
}
