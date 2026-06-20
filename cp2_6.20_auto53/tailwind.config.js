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
        clay: {
          50: '#F5F0E1',
          100: '#EDE5D0',
          200: '#DDD0B5',
          300: '#C9B494',
          400: '#B89B73',
          500: '#D2691E',
          600: '#B8591A',
          700: '#8B4513',
          800: '#6B3310',
          900: '#4A230B',
        },
        olive: {
          400: '#8FB544',
          500: '#6B8E23',
          600: '#5A7519',
        },
        craft: {
          cream: '#F5F0E1',
          orange: '#D2691E',
          brown: '#8B4513',
          olive: '#6B8E23',
        }
      },
      fontFamily: {
        serif: ['Noto Serif SC', 'serif'],
        sans: ['Noto Sans SC', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
