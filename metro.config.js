const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

//  Support .cjs files for Firebase
config.resolver.sourceExts.push("cjs");

//  Disable unstable package exports for Firebase
config.resolver.unstable_enablePackageExports = false;

// Optimize caching and performance
config.transformer.minifierConfig = {
  keep_classnames: true,
  keep_fnames: true,
  mangle: {
    keep_classnames: true,
    keep_fnames: true,
  },
};

// Enable caching
config.resetCache = false;

//  Add support for .svg files
const assetExts = config.resolver.assetExts.filter(ext => ext !== "svg");
const sourceExts = [...config.resolver.sourceExts, "svg"];

// Use try-catch to handle cases where svg-transformer might not be installed yet
try {
  config.transformer.babelTransformerPath = require.resolve("react-native-svg-transformer");
  config.resolver.assetExts = assetExts;
  config.resolver.sourceExts = sourceExts;
} catch (e) {
  console.warn("react-native-svg-transformer not found, SVG support disabled");
}

//  Wrap with NativeWind config
module.exports = withNativeWind(config, { input: './global.css' });