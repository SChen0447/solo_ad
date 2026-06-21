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
        library: {
          bg: '#f5e6d3',
          brown: '#5c3a21',
          'brown-light': '#7a4e30',
          gold: '#d69e2e',
          silver: '#a0aec0',
          bronze: '#d68a2e',
        }
      },
    },
  },
  plugins: [],
};
