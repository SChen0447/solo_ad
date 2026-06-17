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
        coral: {
          50: '#FEF2F1',
          100: '#FDE5E3',
          200: '#FBCBC8',
          300: '#F7A19B',
          400: '#F07D75',
          500: '#E8655A',
          600: '#D94A3E',
          700: '#B53A30',
          800: '#93312A',
          900: '#7A2D27',
        },
        slate: {
          50: '#F5F6F8',
          100: '#E8ECF1',
          200: '#D1D9E3',
          300: '#B3C1D1',
          400: '#94A7BC',
          500: '#768DA6',
          600: '#5E758E',
          700: '#495D74',
          800: '#3A4F65',
          900: '#3A3F47',
        },
      },
      fontFamily: {
        sans: ['"Noto Sans SC"', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.25s ease-out',
        'check-mark': 'checkMark 0.5s ease-out forwards',
        'ripple': 'ripple 0.6s linear',
        'spin-slow': 'spin 1s linear infinite',
        'underline-expand': 'underlineExpand 0.2s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        checkMark: {
          '0%': { strokeDashoffset: '100' },
          '100%': { strokeDashoffset: '0' },
        },
        ripple: {
          '0%': { transform: 'scale(0)', opacity: '0.5' },
          '100%': { transform: 'scale(4)', opacity: '0' },
        },
        underlineExpand: {
          '0%': { transform: 'scaleX(0)', transformOrigin: 'center' },
          '100%': { transform: 'scaleX(1)', transformOrigin: 'center' },
        },
      },
    },
  },
  plugins: [],
};
