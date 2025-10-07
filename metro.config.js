const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

//  Support .cjs files for Firebase
config.resolver.sourceExts.push("cjs");

//  Disable unstable package exports for Firebase
config.resolver.unstable_enablePackageExports = false;

//  Add support for .svg files
const assetExts = config.resolver.assetExts.filter(ext => ext !== "svg");
const sourceExts = [...config.resolver.sourceExts, "svg"];

config.transformer.babelTransformerPath = require.resolve("react-native-svg-transformer");
config.resolver.assetExts = assetExts;
config.resolver.sourceExts = sourceExts;

//  Wrap with NativeWind config
module.exports = withNativeWind(config, { input: './global.css' });