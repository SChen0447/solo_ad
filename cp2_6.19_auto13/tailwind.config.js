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
        gallery: {
          bg: '#1a1a2e',
          card: '#16213e',
          accent: '#e94560',
          deep: '#0f3460',
          text: '#e0e0e0',
          muted: '#8892a4',
        }
      },
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        body: ['"Noto Sans SC"', 'sans-serif'],
      },
      borderRadius: {
        'card': '12px',
      },
      keyframes: {
        'bar-bounce-in': {
          '0%': { transform: 'scaleY(0)', opacity: '0' },
          '60%': { transform: 'scaleY(1.15)', opacity: '1' },
          '100%': { transform: 'scaleY(1)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'overlay-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '0.5' },
        },
        'heart-pop': {
          '0%': { transform: 'scale(1)' },
          '35%': { transform: 'scale(0.8)' },
          '70%': { transform: 'scale(1.15)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      animation: {
        'bar-bounce-in': 'bar-bounce-in 0.5s ease-out forwards',
        'fade-in': 'fade-in 0.3s ease-out forwards',
        'slide-in': 'slide-in 0.3s ease-out forwards',
        'overlay-in': 'overlay-in 0.3s ease-out forwards',
        'heart-pop': 'heart-pop 0.2s ease-out forwards',
      },
    },
  },
  plugins: [],
};
