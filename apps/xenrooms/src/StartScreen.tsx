import { useRoomsI18n, useRoomsTheme } from '@xenaxio/rooms-native';
import { Image, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/** R0: the app starts in the theme and language of the device; sign-in comes with R1. */
export function StartScreen() {
  const theme = useRoomsTheme();
  const { t } = useRoomsI18n();
  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: theme.background }]}>
      <View style={styles.center}>
        <Image source={require('../assets/logo.png')} style={styles.logo} accessibilityIgnoresInvertColors />
        <Text style={[styles.name, { color: theme.foreground }]}>{t('app.name')}</Text>
        <Text style={[styles.tagline, { color: theme.mutedForeground }]}>{t('app.tagline')}</Text>
        <Text style={[styles.note, { color: theme.mutedForeground, borderColor: theme.border, backgroundColor: theme.muted }]}>{t('app.planning_note')}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  logo: { width: 96, height: 96, marginBottom: 8 },
  name: { fontSize: 28, fontWeight: '700' },
  tagline: { fontSize: 16, textAlign: 'center' },
  note: { marginTop: 24, fontSize: 14, textAlign: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
});
