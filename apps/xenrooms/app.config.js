// XenRooms: Xenaxio's chat app for phones (step 152 of the platform plan).
// android/ and ios/ are not committed: `expo prebuild` makes them in every
// build, so every native setting lives here (or in a config plugin).
const fs = require('node:fs');
const path = require('node:path');

const VERSION = fs.readFileSync(path.join(__dirname, 'VERSION'), 'utf8').trim();
// App Store Connect refuses a build number it has seen for this version: CI
// passes the workflow run number, local builds use 1 (never uploaded).
const BUILD_NUMBER = process.env.BUILD_NUMBER || '1';
// The dark field of the XenRooms mark.
const MARK_FIELD = '#050b1a';

module.exports = {
  expo: {
    name: 'XenRooms',
    slug: 'xenrooms',
    // xenrooms://auth/callback is where the platform's sign-in returns
    // (MOBILE_REDIRECT_URIS in apps/api/src/routes/mobile.ts).
    scheme: 'xenrooms',
    version: VERSION,
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
      dark: { image: './assets/splash-icon.png', backgroundColor: '#0a0a0a' },
    },
    ios: {
      bundleIdentifier: 'com.xenaxio.xenrooms',
      buildNumber: BUILD_NUMBER,
      supportsTablet: false,
      // Standard TLS only: exempt from export compliance documentation.
      config: { usesNonExemptEncryption: false },
    },
    android: {
      package: 'com.xenaxio.xenrooms',
      versionCode: Number(BUILD_NUMBER),
      adaptiveIcon: { foregroundImage: './assets/adaptive-icon.png', backgroundColor: MARK_FIELD },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
    },
    plugins: ['expo-localization', './plugins/ios-signing'],
  },
};
