// Names the App Store profile on the app target only. xenrooms' release
// workflow passes IOS_APP_PROFILE (the profile's UUID) and APPLE_TEAM_ID;
// xcodebuild's command line would give every target, the pods too, the same
// profile. Without IOS_APP_PROFILE nothing changes (local and unsigned builds).
const { withXcodeProject } = require('expo/config-plugins');

function setAppSigning(project, { bundleId, profile, teamId }) {
  const configs = project.pbxXCBuildConfigurationSection();
  let changed = 0;
  for (const config of Object.values(configs)) {
    const settings = config && typeof config === 'object' ? config.buildSettings : null;
    if (!settings) continue;
    const id = String(settings.PRODUCT_BUNDLE_IDENTIFIER ?? '').replace(/"/g, '');
    if (id !== bundleId) continue;
    settings.CODE_SIGN_STYLE = 'Manual';
    settings.PROVISIONING_PROFILE = `"${profile}"`;
    settings.PROVISIONING_PROFILE_SPECIFIER = '""';
    if (teamId) settings.DEVELOPMENT_TEAM = teamId;
    if (config.name === 'Release') settings.CODE_SIGN_IDENTITY = '"Apple Distribution"';
    changed++;
  }
  return changed;
}

function withIosSigning(config) {
  const profile = process.env.IOS_APP_PROFILE || '';
  if (!profile) return config;
  return withXcodeProject(config, (cfg) => {
    const bundleId = cfg.ios?.bundleIdentifier;
    const changed = setAppSigning(cfg.modResults, { bundleId, profile, teamId: process.env.APPLE_TEAM_ID || '' });
    if (changed === 0) throw new Error(`plugins/ios-signing: no build configuration for ${bundleId}`);
    return cfg;
  });
}

module.exports = withIosSigning;
module.exports.setAppSigning = setAppSigning;
