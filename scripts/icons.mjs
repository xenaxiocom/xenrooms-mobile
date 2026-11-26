#!/usr/bin/env node
// The app's icon, splash and logo from the XenRooms mark of the web client.
// Run by hand when the mark changes; the results are committed.
//
//   node scripts/icons.mjs --webmail <webmail checkout>
//
// Sources: public/xenrooms/icon-512.png (the mark, transparent) and
// public/xenrooms/icon-maskable-512.png (the mark on its dark field). sharp is
// taken from the web client's dependencies, so this repository needs none.
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const at = process.argv.indexOf('--webmail');
const webmail = path.resolve(at === -1 ? path.join(ROOT, '../webmail') : process.argv[at + 1]);
const sharp = createRequire(path.join(webmail, 'package.json'))('sharp');
const MARK = path.join(webmail, 'public/xenrooms/icon-512.png');
const FIELD = path.join(webmail, 'public/xenrooms/icon-maskable-512.png');
const ASSETS = path.join(ROOT, 'apps/xenrooms/assets');

/** The mark at `scale` of a transparent square of `size`. */
async function padded(size, scale) {
  const inner = Math.round(size * scale);
  const mark = await sharp(MARK).resize(inner, inner, { kernel: 'lanczos3' }).png().toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: mark, gravity: 'center' }])
    .png({ compressionLevel: 9 });
}

// iOS wants an opaque icon (the dark field); Android's adaptive foreground keeps to its safe zone.
await sharp(FIELD).resize(1024, 1024, { kernel: 'lanczos3' }).flatten({ background: '#050b1a' }).png({ compressionLevel: 9 }).toFile(path.join(ASSETS, 'icon.png'));
await (await padded(1024, 0.62)).toFile(path.join(ASSETS, 'adaptive-icon.png'));
await (await padded(1024, 0.6)).toFile(path.join(ASSETS, 'splash-icon.png'));
await sharp(MARK).resize(288, 288, { kernel: 'lanczos3' }).png({ compressionLevel: 9 }).toFile(path.join(ASSETS, 'logo.png'));
// Android's notification icon: the mark's silhouette in white on transparent.
const silhouette = await (await padded(96, 0.9)).toBuffer();
const alpha = await sharp(silhouette).ensureAlpha().extractChannel(3).raw().toBuffer();
await sharp({ create: { width: 96, height: 96, channels: 3, background: { r: 255, g: 255, b: 255 } } })
  .joinChannel(alpha, { raw: { width: 96, height: 96, channels: 1 } })
  .png({ compressionLevel: 9 })
  .toFile(path.join(ASSETS, 'notification-icon.png'));
console.log(`Icons written to ${path.relative(ROOT, ASSETS)}`);
