const colors = require('tailwindcss/colors')

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Palette B (Charcoal & Amber): tutti gli accenti viola/indaco
        // diventano ambra senza dover toccare i file .tsx.
        violet: colors.amber,
        indigo: colors.amber,
      },
      borderRadius: {
        // Riduce gli arrotondamenti grandi: rounded-2xl e rounded-3xl
        // passano da 16-24px a 6px (look business).
        // rounded-full e gli altri restano invariati.
        '2xl': '0.375rem',
        '3xl': '0.375rem',
      },
    },
  },
  plugins: [],
}
