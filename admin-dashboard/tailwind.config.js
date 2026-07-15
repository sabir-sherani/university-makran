/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#041476',
        secondary: '#FA7902',
        accent: '#FA7902',
      },
    },
  },
  plugins: [],
};
