import { createContext, type ReactNode, useContext } from 'react';
import { createTranslator, type RoomsLocale, type Translate } from './index';

interface I18n {
  locale: RoomsLocale;
  t: Translate;
}

const I18nContext = createContext<I18n>({ locale: 'en', t: createTranslator('en') });

export function RoomsI18nProvider({ locale, t, children }: I18n & { children: ReactNode }) {
  return <I18nContext.Provider value={{ locale, t }}>{children}</I18nContext.Provider>;
}

export function useRoomsI18n(): I18n {
  return useContext(I18nContext);
}
