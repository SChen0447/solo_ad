/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        primary: {
          light: '#A8D8EA',
          DEFAULT: '#AA96DA',
          dark: '#8B7DB8',
        },
        cream: '#FFF8F0',
      },
      fontFamily: {
        display: ['Quicksand', 'sans-serif'],
        body: ['Noto Sans SC', 'sans-serif'],
      },
      backdropBlur: {
        glass: '8px',
      },
    },
  },
  plugins: [],
};
