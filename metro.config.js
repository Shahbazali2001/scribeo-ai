const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Ensure Metro can always resolve react-native-css-interop even if nested under nativewind
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, "node_modules"),
  path.resolve(__dirname, "node_modules/nativewind/node_modules"),
  ...(config.resolver.nodeModulesPaths || []),
];

module.exports = withNativeWind(config, { input: "./src/global.css" });
