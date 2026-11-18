import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);

describe('app config', () => {
  it('is XenRooms, with the sign-in link the platform allows', () => {
    const { expo } = require('../app.config.js');
    expect(expo.name).toBe('XenRooms');
    expect(expo.ios.bundleIdentifier).toBe('com.xenaxio.xenrooms');
    expect(expo.android.package).toBe('com.xenaxio.xenrooms');
    // MOBILE_REDIRECT_URIS of the platform: xenrooms://auth/callback.
    expect(expo.scheme).toBe('xenrooms');
    expect(expo.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('has its own texts in German and English with the same keys', () => {
    const keys = (o: object, p = ''): string[] => Object.entries(o).flatMap(([k, v]) => (typeof v === 'string' ? [p + k] : keys(v, `${p}${k}.`)));
    expect(keys(require('../locales/de.json')).sort()).toEqual(keys(require('../locales/en.json')).sort());
  });
});
