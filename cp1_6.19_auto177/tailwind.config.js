/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        space: {
          dark: '#0a1628',
          DEFAULT: '#0f172a',
          light: '#1e293b',
        },
        ocean: {
          DEFAULT: '#1e88e5',
          dark: '#0d47a1',
          light: '#64b5f6',
        },
        warm: {
          start: '#ff6b35',
          end: '#ffd93d',
        },
        cold: {
          start: '#4facfe',
          end: '#00f2fe',
        },
      },
      fontFamily: {
        display: ['Playfair Display', 'Noto Serif SC', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'scale-in': 'scaleIn 2s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.3)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
