import { createContext, type ReactNode, useContext } from 'react';
import { lightTheme, type RoomsTheme } from './theme';

const ThemeContext = createContext<RoomsTheme>(lightTheme);

/** The host app picks the theme (light or dark, company colour); the screens read it. */
export function RoomsThemeProvider({ theme, children }: { theme: RoomsTheme; children: ReactNode }) {
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useRoomsTheme(): RoomsTheme {
  return useContext(ThemeContext);
}
