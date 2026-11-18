// Rooms in German and English. The texts are the web client's
// (lib/xenaxio/messages-*.json, sections common, chat and rooms; copied by
// scripts/sync-messages.mjs), so the phone says what the browser says. The
// host app adds its own keys on top.
import de from '../../locales/de.json';
import en from '../../locales/en.json';
import { format, type MessageParams } from './format';

export type RoomsLocale = 'de' | 'en';
export type Messages = { [key: string]: string | Messages };

export const ROOMS_MESSAGES: Record<RoomsLocale, Messages> = { de: de as Messages, en: en as Messages };

/** German for German devices, English otherwise (as the web client). */
export function pickLocale(tags: readonly (string | null | undefined)[]): RoomsLocale {
  for (const tag of tags) {
    const lang = tag?.toLowerCase().split(/[-_]/)[0];
    if (lang === 'de') return 'de';
    if (lang === 'en') return 'en';
  }
  return 'en';
}

function lookup(messages: Messages, key: string): string | undefined {
  let node: string | Messages | undefined = messages;
  for (const part of key.split('.')) {
    if (typeof node !== 'object' || node === null) return undefined;
    node = node[part];
  }
  return typeof node === 'string' ? node : undefined;
}

/** Deep merge: `extra` wins. */
export function mergeMessages(base: Messages, extra: Messages): Messages {
  const out: Messages = { ...base };
  for (const [key, value] of Object.entries(extra)) {
    const current = out[key];
    out[key] = typeof value === 'object' && typeof current === 'object' ? mergeMessages(current, value) : value;
  }
  return out;
}

export type Translate = (key: string, params?: MessageParams) => string;

/** `t('chat.send')`: the locale's text, else the English one, else the key itself. */
export function createTranslator(locale: RoomsLocale, extra: Partial<Record<RoomsLocale, Messages>> = {}): Translate {
  const own = mergeMessages(ROOMS_MESSAGES[locale], extra[locale] ?? {});
  const fallback = mergeMessages(ROOMS_MESSAGES.en, extra.en ?? {});
  return (key, params) => {
    const text = lookup(own, key) ?? lookup(fallback, key);
    return text === undefined ? key : format(text, params, locale);
  };
}

/** Every key of a catalogue, dotted, for checks. */
export function messageKeys(messages: Messages, prefix = ''): string[] {
  return Object.entries(messages).flatMap(([key, value]) => (typeof value === 'string' ? [`${prefix}${key}`] : messageKeys(value, `${prefix}${key}.`)));
}

export { format, type MessageParams };
