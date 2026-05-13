/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        kosher: {
          cream: '#FDF6EC',
          warm: '#F5E6D0',
          gold: '#C8963E',
          'gold-light': '#E8B86D',
          'gold-dark': '#9E7030',
          blue: '#2C5F8A',
          'blue-light': '#4A7BA8',
          green: '#2D6A4F',
          'green-light': '#40916C',
          red: '#C1121F',
          'red-light': '#E63946',
          amber: '#F4A261',
          text: '#2D2417',
          'text-light': '#6B5744',
          border: '#E8D5BB',
        }
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
