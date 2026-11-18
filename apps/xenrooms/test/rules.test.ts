// Platform rule 11: screens take their colours from the theme only.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../../..');
const SCREENS = ['apps/xenrooms/src', 'apps/xenrooms/App.tsx', 'packages/rooms-native/src'];
/** The token values themselves. */
const ALLOWED = new Set(['packages/rooms-native/src/theme.ts']);

function files(rel: string): string[] {
  const abs = path.join(ROOT, rel);
  if (statSync(abs).isFile()) return [rel];
  return readdirSync(abs).flatMap((name) => files(path.join(rel, name)));
}

describe('colours come from the theme', () => {
  it('no hex, rgb() or named colours in screens', () => {
    const offenders: string[] = [];
    for (const file of SCREENS.flatMap(files).filter((f) => /\.(ts|tsx)$/.test(f) && !ALLOWED.has(f))) {
      const text = readFileSync(path.join(ROOT, file), 'utf8');
      const bad = text.match(/#[0-9a-fA-F]{3,8}\b|\brgba?\(|\b(?:color|backgroundColor|borderColor)\s*:\s*'(?!transparent)[a-z]+'/g);
      if (bad) offenders.push(`${file}: ${bad.join(', ')}`);
    }
    expect(offenders).toEqual([]);
  });
});
