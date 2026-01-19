const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// 1. Sokongan Firebase
config.resolver.sourceExts.push("cjs");
// Tetapkan false jika Firebase bermasalah, tapi cuba 'true' jika expo-speech-recognition gagal
config.resolver.unstable_enablePackageExports = false; 

// 2. Konfigurasi SVG
const { transformer, resolver } = config;

config.transformer = {
  ...transformer,
  // Menggunakan svg-transformer sebagai pemproses fail .svg
  babelTransformerPath: require.resolve("react-native-svg-transformer"),
  minifierConfig: {
    keep_classnames: true,
    keep_fnames: true,
    mangle: {
      keep_classnames: true,
      keep_fnames: true,
    },
  },
};

config.resolver = {
  ...resolver,
  assetExts: resolver.assetExts.filter((ext) => ext !== "svg"),
  sourceExts: [...resolver.sourceExts, "svg"],
};

// 3. Performance
config.resetCache = false;

// 4. Gabungkan dengan NativeWind
module.exports = withNativeWind(config, { input: './global.css' });