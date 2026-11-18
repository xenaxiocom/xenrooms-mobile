// The theme of Rooms on phones: the web client's tokens (app/globals.css of
// xenaxiocom/webmail), so a screen reads `primary` or `muted-foreground` and
// never a colour of its own (platform rule 11). The company colour becomes
// `primary` the way the web client's brandCss does it.

export interface RoomsTheme {
  dark: boolean;
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  success: string;
  successForeground: string;
  warning: string;
  warningForeground: string;
  info: string;
  infoForeground: string;
  border: string;
  input: string;
  ring: string;
  sidebar: string;
  sidebarForeground: string;
  sidebarAccent: string;
  sidebarAccentForeground: string;
}

/** `:root` of the web client. */
export const lightTheme: RoomsTheme = {
  dark: false,
  background: '#ffffff',
  foreground: '#0f172a',
  card: '#ffffff',
  cardForeground: '#0f172a',
  popover: '#ffffff',
  popoverForeground: '#0f172a',
  primary: '#185aea',
  primaryForeground: '#ffffff',
  secondary: '#f8fafc',
  secondaryForeground: '#0f172a',
  muted: '#f1f5f9',
  mutedForeground: '#59687c',
  accent: '#dbeafe',
  accentForeground: '#1e40af',
  destructive: '#dc2626',
  destructiveForeground: '#ffffff',
  success: '#22c55e',
  successForeground: '#ffffff',
  warning: '#eab308',
  warningForeground: '#ffffff',
  info: '#3b82f6',
  infoForeground: '#ffffff',
  border: '#e2e8f0',
  input: '#e2e8f0',
  ring: '#2563eb',
  sidebar: '#f8fafc',
  sidebarForeground: '#0f172a',
  sidebarAccent: '#f1f5f9',
  sidebarAccentForeground: '#0f172a',
};

/** `.dark` of the web client. */
export const darkTheme: RoomsTheme = {
  dark: true,
  background: '#0a0a0a',
  foreground: '#fafafa',
  card: '#141414',
  cardForeground: '#fafafa',
  popover: '#1c1c1c',
  popoverForeground: '#fafafa',
  primary: '#fafafa',
  primaryForeground: '#171717',
  secondary: '#262626',
  secondaryForeground: '#fafafa',
  muted: '#262626',
  mutedForeground: '#adadad',
  accent: '#1e3a8a',
  accentForeground: '#dbeafe',
  destructive: '#ef4444',
  destructiveForeground: '#0a0a0a',
  success: '#16a34a',
  successForeground: '#ffffff',
  warning: '#ca8a04',
  warningForeground: '#ffffff',
  info: '#60a5fa',
  infoForeground: '#ffffff',
  border: 'rgba(128, 128, 128, 0.3)',
  input: '#262626',
  ring: '#d4d4d4',
  sidebar: '#0a0a0a',
  sidebarForeground: '#fafafa',
  sidebarAccent: '#1a1a1a',
  sidebarAccentForeground: '#fafafa',
};

const HEX = /^#[0-9a-fA-F]{6}$/;

function luminance(hex: string): number {
  const channel = (i: number) => {
    const c = Number.parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(1) + 0.0722 * channel(2);
}

/** WCAG contrast of two `#rrggbb` colours, 1 to 21. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

export interface CompanyColors {
  /** The company colour (`#rrggbb`), or none. */
  color?: string | null;
  /** Its text colour; chosen by contrast when not given. */
  text?: string | null;
}

/**
 * The theme for light or dark, with the company colour as `primary` (as the
 * web client's brandCss): dark mode keeps its own primary when the company
 * colour would not stand out on the dark background.
 */
export function roomsTheme(dark: boolean, company: CompanyColors = {}): RoomsTheme {
  const base = dark ? darkTheme : lightTheme;
  const color = company.color;
  if (!color || !HEX.test(color)) return base;
  if (dark && contrastRatio(color, base.background) < 3) return base;
  const text = company.text && HEX.test(company.text) ? company.text : contrastRatio(color, '#ffffff') >= contrastRatio(color, '#111111') ? '#ffffff' : '#111111';
  return { ...base, primary: color, primaryForeground: text, ring: color };
}
