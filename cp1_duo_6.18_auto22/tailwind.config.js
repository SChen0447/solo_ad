/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        poppins: ['Poppins', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        'daw-bg': '#121212',
        'daw-surface': '#1e1e1e',
        'daw-text': '#e0e0e0',
        'daw-accent': '#00acc1',
        'daw-play': '#4caf50',
        'daw-stop': '#e53935',
        'daw-orange': '#ff9800',
      },
    },
  },
  plugins: [],
}
