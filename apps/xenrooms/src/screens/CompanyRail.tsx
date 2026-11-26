// The companies, as the rail on xenrooms.app (on a phone in a drawer, step 106): logos with
// the others' red counts, a tap switches without signing in, "+" adds companies, a long press
// moves one or signs it out on this phone.
import { useRoomsI18n, useRoomsTheme } from '@xenaxio/rooms-native';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Account } from '../account';
import { CompanyMark } from '../CompanyMark';
import { useCompanies } from '../companies';
import { registerPush } from '../push';
import { SignInError, signIn } from '../signin';

export function CompanyRail({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const theme = useRoomsTheme();
  const { t } = useRoomsI18n();
  const { accounts, activeId, counts, open, move, leave, add } = useCompanies();

  const more = (a: Account) =>
    Alert.alert(a.company, a.email, [
      { text: t('app.move_up'), onPress: () => void move(a.userId, -1) },
      { text: t('app.move_down'), onPress: () => void move(a.userId, 1) },
      {
        text: t('app.sign_out'),
        style: 'destructive',
        onPress: () =>
          Alert.alert(t('app.sign_out_title'), t('app.sign_out_text', { company: a.company }), [
            { text: t('app.cancel'), style: 'cancel' },
            { text: t('app.sign_out'), style: 'destructive', onPress: () => void leave(a.userId) },
          ]),
      },
      { text: t('app.cancel'), style: 'cancel' },
    ]);

  const addCompany = async () => {
    const origin = accounts.find((a) => a.userId === activeId)?.origin ?? accounts[0]?.origin;
    if (!origin) return;
    try {
      const added = await signIn(origin, { add: true, have: accounts.map((a) => a.userId) });
      await add(added);
      void registerPush(added);
      onClose();
    } catch (err) {
      if (!(err instanceof SignInError && err.reason === 'cancelled')) Alert.alert(t('app.sign_in_failed'));
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.wrap}>
        <SafeAreaView style={[styles.panel, { backgroundColor: theme.sidebar, borderColor: theme.border }]}>
          <Text style={[styles.title, { color: theme.sidebarForeground }]}>{t('app.companies')}</Text>
          <ScrollView contentContainerStyle={styles.list}>
            {accounts.map((a) => {
              const active = a.userId === activeId;
              return (
                <Pressable
                  key={a.userId}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => {
                    void open(a.userId);
                    onClose();
                  }}
                  onLongPress={() => more(a)}
                  style={[styles.row, active && { backgroundColor: theme.sidebarAccent }]}
                >
                  <CompanyMark account={a} count={active ? 0 : (counts[a.userId] ?? 0)} />
                  <View style={styles.text}>
                    <Text numberOfLines={1} style={[styles.company, { color: theme.sidebarForeground }]}>
                      {a.company}
                    </Text>
                    <Text numberOfLines={1} style={[styles.email, { color: theme.mutedForeground }]}>
                      {a.email}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
            <Pressable onPress={() => void addCompany()} accessibilityRole="button" style={styles.row}>
              <View style={[styles.plus, { borderColor: theme.border }]}>
                <Text style={{ color: theme.mutedForeground, fontSize: 22 }}>+</Text>
              </View>
              <Text style={[styles.company, { color: theme.sidebarForeground }]}>{t('app.add_company')}</Text>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
        <Pressable style={styles.rest} onPress={onClose} accessibilityLabel={t('app.cancel')} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, flexDirection: 'row' },
  panel: { width: '82%', maxWidth: 360, borderRightWidth: StyleSheet.hairlineWidth },
  rest: { flex: 1 },
  title: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  list: { paddingBottom: 24 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  text: { flex: 1, minWidth: 0 },
  company: { fontSize: 16, fontWeight: '600' },
  email: { fontSize: 13 },
  plus: { width: 40, height: 40, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
});
