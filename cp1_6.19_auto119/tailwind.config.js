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
        wood: {
          50: '#FFF8F0',
          100: '#F5E6D3',
          200: '#E8D0B3',
          300: '#D4A574',
          400: '#C4934F',
          500: '#B8860B',
          600: '#8B6914',
          700: '#5D4037',
          800: '#3E2723',
          900: '#2C1810',
        },
        success: '#6B8E23',
        danger: '#C75B39',
      },
      fontFamily: {
        display: ['Playfair Display', 'serif'],
        body: ['Lora', 'serif'],
      },
      borderRadius: {
        'card': '12px',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'slide-out': 'slideOut 0.3s ease-in',
        'flash': 'flashHighlight 0.3s ease-in-out 3',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideOut: {
          '0%': { transform: 'translateY(0)', opacity: '1' },
          '100%': { transform: 'translateY(-100%)', opacity: '0' },
        },
        flashHighlight: {
          '0%, 100%': { backgroundColor: 'transparent' },
          '50%': { backgroundColor: '#D4A574' },
        },
      },
    },
  },
  plugins: [],
};
