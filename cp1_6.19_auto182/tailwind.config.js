/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          50: '#FFFBF5',
          100: '#FFF8F0',
          200: '#FFEFE0',
        },
        orange: {
          100: '#FFE8D6',
          200: '#FFD4B8',
          300: '#FFB380',
          400: '#FFA94D',
          500: '#FF922B',
        },
        green: {
          100: '#D3F9D8',
          200: '#B8E6B8',
          300: '#8CE99A',
          400: '#51CF66',
          500: '#40C057',
        },
        red: {
          400: '#FF6B6B',
          500: '#FA5252',
        },
      },
      borderRadius: {
        'md': '12px',
        'lg': '16px',
      },
      fontFamily: {
        sans: ['Noto Sans SC', 'sans-serif'],
        serif: ['Noto Serif SC', 'serif'],
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.3s ease-out',
        'slide-in-left': 'slideInLeft 0.5s ease-out',
        'shimmer': 'shimmer 1s ease-in-out infinite',
        'blink': 'blink 0.8s ease-in-out infinite',
        'progress': 'progress 1.5s ease-in-out',
        'sweep': 'sweep 0.3s ease-out forwards',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-30px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.3' },
        },
        progress: {
          '0%': { strokeDashoffset: '283' },
          '100%': { strokeDashoffset: '0' },
        },
        sweep: {
          '0%': { width: '0%' },
          '100%': { width: '100%' },
        },
      },
    },
  },
  plugins: [],
}
