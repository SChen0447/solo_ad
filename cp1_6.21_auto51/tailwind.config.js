/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#FFF8E1',
          100: '#FFECB3',
          200: '#FFD54F',
          300: '#FFCA28',
          400: '#FFC107',
          500: '#FFB300',
          600: '#FFA000',
          700: '#FF8F00',
          800: '#FF6F00',
          900: '#E65100',
        },
        orange: {
          DEFAULT: '#FF8C42',
          light: '#FFB74D',
          dark: '#E65100',
        },
        warm: {
          bg: '#FFF9F0',
          card: '#FFFFFF',
          text: '#333333',
          muted: '#9E9E9E',
          border: '#FFE0B2',
        },
        status: {
          allocated: '#4CAF50',
          rejected: '#EF5350',
          pending: '#FF9800',
        },
      },
      fontFamily: {
        sans: ['"Noto Sans SC"', 'sans-serif'],
      },
      borderRadius: {
        'card': '16px',
      },
      boxShadow: {
        'card': '0 4px 20px rgba(255, 140, 66, 0.12)',
        'card-hover': '0 8px 30px rgba(255, 140, 66, 0.2)',
      },
      animation: {
        'breathe': 'breathe 2s ease-in-out infinite',
      },
      keyframes: {
        breathe: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.03)' },
        },
      },
    },
  },
  plugins: [],
};
