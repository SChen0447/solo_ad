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
        forest: '#2d6a4f',
        sand: '#c4b998',
        cream: '#faf7f0',
        warmgray: '#3a3a3a',
      },
    },
  },
  plugins: [],
};
