#!/usr/bin/env node
// The texts of Rooms come from the web client, so the phone says what the
// browser says. Copies the sections of lib/xenaxio/messages-{de,en}.json that
// Rooms uses into packages/rooms-native/locales/.
//
//   node scripts/sync-messages.mjs [--webmail <checkout>]   copy (default ../webmail)
//   node scripts/sync-messages.mjs --check [--webmail …]     German and English have the same
//       keys here and in the app; with a webmail checkout, also that the copy is current.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SECTIONS = ['common', 'chat', 'rooms'];
const LOCALES = ['de', 'en'];
const OUT = path.join(ROOT, 'packages/rooms-native/locales');
const APP = path.join(ROOT, 'apps/xenrooms/locales');

const arg = (name) => {
  const at = process.argv.indexOf(name);
  return at === -1 ? undefined : process.argv[at + 1];
};
const check = process.argv.includes('--check');
const webmail = path.resolve(arg('--webmail') ?? process.env.WEBMAIL_DIR ?? path.join(ROOT, '../webmail'));
const source = (locale) => path.join(webmail, `lib/xenaxio/messages-${locale}.json`);

const read = (file) => JSON.parse(readFileSync(file, 'utf8'));
const keys = (obj, prefix = '') =>
  Object.entries(obj).flatMap(([k, v]) => (typeof v === 'string' ? [`${prefix}${k}`] : keys(v, `${prefix}${k}.`)));
const sorted = (obj) =>
  typeof obj === 'string' ? obj : Object.fromEntries(Object.keys(obj).sort().map((k) => [k, sorted(obj[k])]));
const extract = (locale) => {
  const all = read(source(locale));
  return sorted(Object.fromEntries(SECTIONS.map((s) => [s, all[s] ?? {}])));
};
const text = (obj) => `${JSON.stringify(obj, null, 2)}\n`;

const problems = [];
function sameKeys(label, dir) {
  const [de, en] = LOCALES.map((l) => new Set(keys(read(path.join(dir, `${l}.json`)))));
  const onlyDe = [...de].filter((k) => !en.has(k));
  const onlyEn = [...en].filter((k) => !de.has(k));
  if (onlyDe.length) problems.push(`${label}: only in German: ${onlyDe.slice(0, 10).join(', ')}${onlyDe.length > 10 ? ' …' : ''}`);
  if (onlyEn.length) problems.push(`${label}: only in English: ${onlyEn.slice(0, 10).join(', ')}${onlyEn.length > 10 ? ' …' : ''}`);
}

const haveWebmail = LOCALES.every((l) => existsSync(source(l)));
if (!check) {
  if (!haveWebmail) throw new Error(`No web client at ${webmail} (use --webmail <checkout>)`);
  for (const locale of LOCALES) writeFileSync(path.join(OUT, `${locale}.json`), text(extract(locale)));
  console.log(`Copied ${SECTIONS.join(', ')} from ${webmail}`);
} else {
  sameKeys('rooms-native', OUT);
  sameKeys('xenrooms app', APP);
  if (haveWebmail) {
    for (const locale of LOCALES) {
      if (readFileSync(path.join(OUT, `${locale}.json`), 'utf8') !== text(extract(locale))) {
        problems.push(`rooms-native/${locale}.json differs from the web client: run pnpm messages:sync`);
      }
    }
  } else {
    console.log(`No web client at ${webmail}: compared German and English only.`);
  }
  if (problems.length) {
    console.error(problems.join('\n'));
    process.exit(1);
  }
  console.log('Messages OK');
}
