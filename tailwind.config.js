/** @type {import('tailwindcss').Config} */
module.exports = {
   content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./screens/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],

  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: '#FF914D',
        secondary: '#FFF4E0',
        darkBrown: '#4E342E',
        lightBrown: '#A1887F',
        white: '#FFFFFF',
        blush: '#FFA07A',
        accent: '#FFB86B',
        black: '#000000',
      },
    },
  },
  plugins: [],
};
