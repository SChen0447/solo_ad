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
        neon: {
          blue: '#00d4ff',
          purple: '#a855f7',
        },
        clip: {
          translate: '#3b82f6',
          rotate: '#22c55e',
          scale: '#f97316',
          opacity: '#a855f7',
        },
        surface: {
          900: '#0a0a12',
          800: '#12121e',
          700: '#1a1a2e',
          600: '#22223a',
          500: '#2a2a46',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'spring-in': 'springIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      keyframes: {
        springIn: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
