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
        warm: {
          50: '#FFF5E6',
          100: '#FFE8C2',
          200: '#FFD48A',
          300: '#FFC05C',
          400: '#FFA94D',
          500: '#FF8C42',
          600: '#E67330',
          700: '#CC5A1E',
          800: '#993F12',
          900: '#662A0C',
        },
        surface: {
          primary: '#FFF5E6',
          card: '#FFFFFF',
          dark: '#333333',
          muted: '#888888',
        },
        skill: {
          beginner: '#4CAF50',
          intermediate: '#FF8C42',
          advanced: '#E53935',
        },
      },
      fontFamily: {
        sans: ['"Noto Sans SC"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'card': '12px',
        'btn': '8px',
      },
      boxShadow: {
        'card': '0 2px 12px rgba(0,0,0,0.08)',
        'card-hover': '0 6px 20px rgba(0,0,0,0.14)',
        'modal': '0 16px 48px rgba(0,0,0,0.2)',
      },
    },
  },
  plugins: [],
};
