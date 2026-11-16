/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  // Include paths to all folders containing NativeWind classes
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {},
  },
  plugins: [],
};
