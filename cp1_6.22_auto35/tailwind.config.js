/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      keyframes: {
        scaleIn: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        ripple: {
          '0%': { transform: 'scale(0)', opacity: '1' },
          '100%': { transform: 'scale(4)', opacity: '0' },
        },
        'slide-in': {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      colors: {
        'dark-bg': '#1a1a2e',
        'dark-card': '#16213e',
        'dark-accent': '#0f3460',
        'dark-primary': '#e94560',
        'chart-1': '#667eea',
        'chart-2': '#764ba2',
        'chart-3': '#f093fb',
        'chart-4': '#4facfe',
        'chart-5': '#43e97b',
      },
      animation: {
        ripple: 'ripple 0.6s ease-out forwards',
        'slide-in': 'slide-in 0.3s ease-out forwards',
      },
    },
  },
  plugins: [],
};
