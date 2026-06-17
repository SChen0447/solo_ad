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
        primary: '#1a1a2e',
        secondary: '#16213e',
        accent: '#e94560',
        'accent-hover': '#ff6b8a',
        'char-gradient-start': '#4f46e5',
        'char-gradient-end': '#9333ea',
        'mon-gradient-start': '#f97316',
        'mon-gradient-end': '#dc2626',
        'hp-low': '#22c55e',
        'hp-high': '#ef4444',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Consolas', 'Monaco', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'damage-pop': 'damagePop 0.5s ease-out forwards',
        'crit-pop': 'critPop 0.5s ease-out forwards',
        'miss-float': 'missFloat 0.8s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        damagePop: {
          '0%': { opacity: '1', transform: 'translateY(0) scale(1)' },
          '100%': { opacity: '0', transform: 'translateY(-20px) scale(1)' },
        },
        critPop: {
          '0%': { opacity: '1', transform: 'translateY(0) scale(1)' },
          '50%': { transform: 'translateY(-10px) scale(1.5)' },
          '100%': { opacity: '0', transform: 'translateY(-30px) scale(1.5)' },
        },
        missFloat: {
          '0%': { opacity: '1', transform: 'translateY(0) rotate(-5deg)' },
          '100%': { opacity: '0', transform: 'translateY(-30px) rotate(5deg)' },
        },
      },
    },
  },
  plugins: [],
};
