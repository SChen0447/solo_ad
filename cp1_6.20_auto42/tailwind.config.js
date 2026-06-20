/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/frontend/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2A9D8F',
        'primary-dark': '#21867A',
        secondary: '#E9C46A',
        'secondary-dark': '#D4A94F',
      },
      fontFamily: {
        display: ['Playfair Display', 'serif'],
        body: ['Noto Sans SC', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
