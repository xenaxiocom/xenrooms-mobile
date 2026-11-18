import { createTranslator, pickLocale, RoomsI18nProvider, RoomsThemeProvider, roomsTheme } from '@xenaxio/rooms-native';
import { getLocales } from 'expo-localization';
import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import de from './locales/de.json';
import en from './locales/en.json';
import { StartScreen } from './src/StartScreen';

export default function App() {
  const dark = useColorScheme() === 'dark';
  // R1: the language and theme the person picked, from the platform (rule 10); the company colour.
  const locale = pickLocale(getLocales().map((l) => l.languageTag));
  const t = useMemo(() => createTranslator(locale, { de, en }), [locale]);
  const theme = useMemo(() => roomsTheme(dark), [dark]);
  return (
    <SafeAreaProvider>
      <RoomsThemeProvider theme={theme}>
        <RoomsI18nProvider locale={locale} t={t}>
          <StatusBar style={dark ? 'light' : 'dark'} />
          <StartScreen />
        </RoomsI18nProvider>
      </RoomsThemeProvider>
    </SafeAreaProvider>
  );
}
