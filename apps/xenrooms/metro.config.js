// Expo finds the pnpm workspace by itself (docs.expo.dev/guides/monorepos);
// @xenaxio/rooms-native is TypeScript source and is compiled like the app.
const { getDefaultConfig } = require('expo/metro-config');

module.exports = getDefaultConfig(__dirname);
