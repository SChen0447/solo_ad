/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'game-bg': '#1a1a2e',
        'game-panel': '#16213e',
        'game-accent': '#e94560',
        'game-gold': '#f5a623',
      },
      animation: {
        'breath': 'breath 2s ease-in-out infinite',
        'pulse-ring': 'pulse-ring 2s ease-in-out infinite',
        'pulse-slow': 'pulse-slow 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s ease-in-out infinite',
        'slide-in': 'slide-in 0.3s ease-out',
        'explosion': 'explosion 0.5s ease-out forwards',
        'fill-cell': 'fill-cell 0.2s ease-out forwards',
        'float-up': 'float-up 1.5s ease-out forwards',
      },
    },
  },
  plugins: [],
}
