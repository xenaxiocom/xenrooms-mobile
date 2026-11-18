import { describe, expect, it } from 'vitest';
import de from '../locales/de.json';
import en from '../locales/en.json';
import { format } from '../src/i18n/format';
import { createTranslator, type Messages, messageKeys, pickLocale } from '../src/i18n/index';

describe('messages', () => {
  it('fills arguments and leaves unknown ones', () => {
    expect(format('Hallo {name}', { name: 'Anna' })).toBe('Hallo Anna');
    expect(format('Hallo {name}')).toBe('Hallo {name}');
  });

  it('picks the plural form of the language', () => {
    const msg = '{count, plural, =0 {keine} one {# Nachricht von {name}} other {# Nachrichten}}';
    expect(format(msg, { count: 0 }, 'de')).toBe('keine');
    expect(format(msg, { count: 1, name: 'Max' }, 'de')).toBe('1 Nachricht von Max');
    expect(format(msg, { count: 5 }, 'de')).toBe('5 Nachrichten');
  });

  it('German, then English, then the key; the app adds its own keys', () => {
    const t = createTranslator('de', { de: { app: { name: 'XenRooms' } }, en: { app: { name: 'XenRooms', only_en: 'Only English' } } });
    expect(t('app.name')).toBe('XenRooms');
    expect(t('app.only_en')).toBe('Only English');
    expect(t('no.such.key')).toBe('no.such.key');
    expect(t('common.cancel')).toBe((de as { common: { cancel: string } }).common.cancel);
  });

  it('German devices get German, everything else English', () => {
    expect(pickLocale(['de-AT', 'en-US'])).toBe('de');
    expect(pickLocale(['fr-FR', 'en-GB'])).toBe('en');
    expect(pickLocale(['uk-UA'])).toBe('en');
    expect(pickLocale([])).toBe('en');
  });

  it('the copied texts of the web client have the same keys in German and English', () => {
    expect(messageKeys(de as Messages).sort()).toEqual(messageKeys(en as Messages).sort());
    expect(messageKeys(de as Messages).length).toBeGreaterThan(500);
  });
});
