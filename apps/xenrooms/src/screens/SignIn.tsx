// "Mit Xenaxio anmelden": the phone's browser signs in once and the app gets the companies
// the person ticks there (step 152 R1, one common sign-in). Another server: "Eigene Adresse".
import { useRoomsI18n, useRoomsTheme } from '@xenaxio/rooms-native';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCompanies } from '../companies';
import { registerPush } from '../push';
import { SignInError, signIn } from '../signin';
import { DEFAULT_ADDRESS, normalizeAddress } from '../signin-core';

export function SignInScreen() {
  const theme = useRoomsTheme();
  const { t } = useRoomsI18n();
  const add = useCompanies((s) => s.add);
  const [own, setOwn] = useState(false);
  const [address, setAddress] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const go = async () => {
    const origin = own ? normalizeAddress(address) : DEFAULT_ADDRESS;
    if (!origin) return setError(t('app.address_invalid'));
    setBusy(true);
    setError(null);
    try {
      const accounts = await signIn(origin);
      await add(accounts);
      void registerPush(accounts);
    } catch (err) {
      if (!(err instanceof SignInError && err.reason === 'cancelled')) setError(t(err instanceof SignInError && err.reason === 'denied' ? 'app.sign_in_denied' : 'app.sign_in_failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: theme.background }]}>
      <View style={styles.center}>
        <Image source={require('../../assets/logo.png')} style={styles.logo} accessibilityIgnoresInvertColors />
        <Text style={[styles.name, { color: theme.foreground }]}>{t('app.name')}</Text>
        <Text style={[styles.tagline, { color: theme.mutedForeground }]}>{t('app.tagline')}</Text>
        {own && (
          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.mutedForeground }]}>{t('app.address_label')}</Text>
            <TextInput
              value={address}
              onChangeText={setAddress}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              placeholder="chat.firma.de"
              placeholderTextColor={theme.mutedForeground}
              style={[styles.input, { color: theme.foreground, borderColor: theme.input, backgroundColor: theme.card }]}
            />
          </View>
        )}
        {error && <Text style={[styles.error, { color: theme.destructive }]}>{error}</Text>}
        <Pressable onPress={go} disabled={busy} accessibilityRole="button" style={[styles.button, { backgroundColor: theme.primary, opacity: busy ? 0.6 : 1 }]}>
          <Text style={[styles.buttonText, { color: theme.primaryForeground }]}>{t('app.sign_in')}</Text>
        </Pressable>
        {!own && (
          <Pressable onPress={() => setOwn(true)} accessibilityRole="button">
            <Text style={[styles.link, { color: theme.primary }]}>{t('app.own_address')}</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  logo: { width: 96, height: 96, marginBottom: 8 },
  name: { fontSize: 28, fontWeight: '700' },
  tagline: { fontSize: 16, textAlign: 'center', marginBottom: 16 },
  field: { alignSelf: 'stretch', gap: 6 },
  label: { fontSize: 13 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, minHeight: 44, fontSize: 16 },
  error: { fontSize: 14, textAlign: 'center' },
  button: { alignSelf: 'stretch', minHeight: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  buttonText: { fontSize: 16, fontWeight: '600' },
  link: { fontSize: 15, padding: 8 },
});
