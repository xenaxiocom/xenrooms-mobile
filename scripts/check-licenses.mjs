#!/usr/bin/env node
// Fails when a package that ends up inside the app has a license outside the
// allow-list (platform rule: MIT, Apache-2.0, BSD, ISC, MPL-2.0). "Inside the
// app" is what Metro puts into the Android and iOS bundles, read from their
// source maps, so build tools (the Expo CLI and its helpers) do not count.
// Exceptions only with the owner's consent, listed below with the reason.
//
//   node scripts/check-licenses.mjs               bundles the app first
//   node scripts/check-licenses.mjs --dist <dir>  an `expo export --source-maps` output
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APP = path.join(ROOT, 'apps/xenrooms');
const ALLOWED = new Set(['MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC', 'MPL-2.0']);
/** package name -> why it is allowed (owner's consent) */
const EXCEPTIONS = {};
/** Our own code, AGPL-3.0 like this repository. */
const OWN = new Set(['@xenaxio/rooms-native', 'xenrooms']);

function allowed(expr) {
  const cleaned = expr.replace(/[()]/g, '').trim();
  if (cleaned.includes(' OR ')) return cleaned.split(' OR ').some((p) => allowed(p));
  if (cleaned.includes(' AND ')) return cleaned.split(' AND ').every((p) => allowed(p));
  return ALLOWED.has(cleaned);
}

const at = process.argv.indexOf('--dist');
let dist = at === -1 ? null : path.resolve(process.argv[at + 1]);
let temporary = null;
if (!dist) {
  temporary = mkdtempSync(path.join(tmpdir(), 'xenrooms-licenses-'));
  dist = temporary;
  execFileSync('npx', ['expo', 'export', '--platform', 'android', '--platform', 'ios', '--source-maps', '--output-dir', dist], {
    cwd: APP,
    stdio: ['ignore', 'ignore', 'inherit'],
    env: { ...process.env, CI: '1', EXPO_NO_TELEMETRY: '1' },
  });
}

const maps = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const file = path.join(dir, name);
    if (statSync(file).isDirectory()) walk(file);
    else if (name.endsWith('.map')) maps.push(file);
  }
};
walk(dist);
if (maps.length === 0) throw new Error(`No source maps in ${dist} (expo export --source-maps)`);

/** package directory -> name */
const packages = new Map();
for (const map of maps) {
  for (const source of JSON.parse(readFileSync(map, 'utf8')).sources ?? []) {
    // Metro writes the paths from the workspace root, with a leading slash.
    const file = source.startsWith('/') && !source.startsWith(ROOT) ? path.join(ROOT, source) : path.resolve(APP, source);
    const match = /^(.*\/node_modules\/(?:@[^/]+\/)?[^/]+)\//.exec(file.split(path.sep).join('/'));
    if (match) packages.set(match[1], null);
  }
}

const problems = [];
const seen = new Map();
for (const dir of packages.keys()) {
  const pkg = JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8'));
  const license = typeof pkg.license === 'string' ? pkg.license : pkg.license?.type ?? 'UNKNOWN';
  seen.set(pkg.name, license);
  if (OWN.has(pkg.name) || allowed(license) || EXCEPTIONS[pkg.name]) continue;
  problems.push(`${pkg.name}@${pkg.version}: ${license}`);
}
if (temporary) rmSync(temporary, { recursive: true, force: true });

if (problems.length > 0) {
  console.error(`Disallowed licenses in the app (${problems.length}):\n  ${[...new Set(problems)].join('\n  ')}`);
  process.exit(1);
}
const counts = {};
for (const license of seen.values()) counts[license] = (counts[license] ?? 0) + 1;
console.log(`Licenses OK: ${seen.size} packages in the app (${Object.entries(counts).map(([l, n]) => `${l} ${n}`).join(', ')})`);
