import { DarkTheme, DefaultTheme, NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createTranslator, pickLocale, type RoomsLocale, RoomsI18nProvider, RoomsThemeProvider, roomsApi, roomsTheme } from '@xenaxio/rooms-native';
import { getLocales } from 'expo-localization';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import de from './locales/de.json';
import en from './locales/en.json';
import { clientOf, useCompanies, watchCounts } from './src/companies';
import type { Stack } from './src/navigation';
import { badgeTotal } from './src/notify';
import { onNotificationTap, setBadge } from './src/push';
import { HomeScreen } from './src/screens/Home';
import { RoomScreen } from './src/screens/Room';
import { SignInScreen } from './src/screens/SignIn';

const Nav = createNativeStackNavigator<Stack>();

/** Language and light/dark as the person chose them on the platform (rule 10), else the device's. */
function usePreferences(origin: string | undefined, token: string | undefined) {
  const [prefs, setPrefs] = useState<{ theme: string | null; locale: string | null }>({ theme: null, locale: null });
  useEffect(() => {
    if (!origin || !token) return;
    let cancelled = false;
    void roomsApi<{ settings: Record<string, unknown> | null }>({ origin, token }, '/settings')
      .then((r) => {
        if (cancelled) return;
        const s = r.settings ?? {};
        setPrefs({ theme: typeof s.theme === 'string' ? s.theme : null, locale: typeof s.locale === 'string' ? s.locale : null });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [origin, token]);
  return prefs;
}

export default function App() {
  const { loaded, accounts, activeId, counts, load, open } = useCompanies();
  const account = accounts.find((a) => a.userId === activeId);
  const prefs = usePreferences(account?.origin, account?.token);
  const system = useColorScheme();
  const dark = prefs.theme === 'dark' || (prefs.theme !== 'light' && system === 'dark');
  const locale: RoomsLocale = pickLocale([prefs.locale, ...getLocales().map((l) => l.languageTag)]);
  const t = useMemo(() => createTranslator(locale, { de, en }), [locale]);
  const theme = useMemo(() => roomsTheme(dark, { color: account?.portal?.color, text: account?.portal?.colorText }), [dark, account?.portal?.color, account?.portal?.colorText]);
  const nav = useNavigationContainerRef<Stack>();

  useEffect(() => {
    void load();
    return watchCounts();
  }, [load]);

  // A tapped notification opens its company and room.
  useEffect(
    () =>
      onNotificationTap(async (target) => {
        if (target.account) await open(target.account);
        const go = () => (nav.isReady() ? nav.navigate('Room', { roomId: target.roomId }) : setTimeout(go, 200));
        go();
      }),
    [nav, open],
  );

  // The app icon: the open company's mentions and direct messages plus the others'.
  const [activeCount, setActiveCount] = useState(0);
  useEffect(() => {
    if (!account) return undefined;
    const client = clientOf(account);
    const update = () => {
      const rooms = [...client.rooms.values()].filter((r) => r.membership === 'join');
      setActiveCount(rooms.reduce((n, r) => n + (r.kind === 'dm' ? r.notifications : r.highlights), 0));
    };
    update();
    return client.subscribe(update);
  }, [account]);
  useEffect(() => setBadge(badgeTotal(activeCount, counts)), [activeCount, counts]);

  const navTheme = {
    ...(dark ? DarkTheme : DefaultTheme),
    colors: { ...(dark ? DarkTheme : DefaultTheme).colors, primary: theme.primary, background: theme.background, card: theme.card, text: theme.foreground, border: theme.border, notification: theme.destructive },
  };

  return (
    <SafeAreaProvider>
      <RoomsThemeProvider theme={theme}>
        <RoomsI18nProvider locale={locale} t={t}>
          <StatusBar style={dark ? 'light' : 'dark'} />
          {!loaded ? null : accounts.length === 0 ? (
            <SignInScreen />
          ) : (
            <NavigationContainer ref={nav} theme={navTheme}>
              <Nav.Navigator>
                <Nav.Screen name="Home" component={HomeScreen} />
                <Nav.Screen name="Room" component={RoomScreen} />
              </Nav.Navigator>
            </NavigationContainer>
          )}
        </RoomsI18nProvider>
      </RoomsThemeProvider>
    </SafeAreaProvider>
  );
}
