// The open company's channels and conversations, with its mark in the header: a tap opens
// the companies (the others' news as a red count).
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RoomList, useRoomsI18n, useRoomsTheme } from '@xenaxio/rooms-native';
import { useLayoutEffect, useState } from 'react';
import { Pressable, Text } from 'react-native';
import { CompanyMark } from '../CompanyMark';
import { clientOf, useCompanies } from '../companies';
import type { Stack } from '../navigation';
import { CompanyRail } from './CompanyRail';

export function HomeScreen({ navigation }: NativeStackScreenProps<Stack, 'Home'>) {
  const theme = useRoomsTheme();
  const { t } = useRoomsI18n();
  const { accounts, activeId, counts } = useCompanies();
  const [rail, setRail] = useState(false);
  const account = accounts.find((a) => a.userId === activeId) ?? accounts[0];
  const others = Object.entries(counts).reduce((n, [id, c]) => (id === activeId ? n : n + c), 0);

  useLayoutEffect(() => {
    if (!account) return;
    navigation.setOptions({
      title: account.company,
      headerLeft: () => (
        <Pressable onPress={() => setRail(true)} accessibilityRole="button" accessibilityLabel={t('app.open_companies')} hitSlop={8}>
          <CompanyMark account={account} size={30} count={others} />
        </Pressable>
      ),
    });
  }, [account, navigation, others, t]);

  if (!account) return <Text style={{ color: theme.mutedForeground }}>{t('chat.loading')}</Text>;
  return (
    <>
      <RoomList key={account.userId} client={clientOf(account)} onOpen={(roomId) => navigation.navigate('Room', { roomId })} />
      <CompanyRail visible={rail} onClose={() => setRail(false)} />
    </>
  );
}
