/** @type {import('tailwindcss').Config} */

export default {
  content: ["./index.html", "./src/frontend/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        primary: '#f59e0b',
        'primary-light': '#fef3c7',
        background: '#fffbeb',
      },
      boxShadow: {
        card: '0 2px 8px rgba(245,158,11,0.1)',
        'card-hover': '0 8px 24px rgba(245,158,11,0.2)',
      },
      animation: {
        'shimmer': 'shimmer 1.2s infinite',
        'fade-in': 'fadeIn 0.3s ease',
        'slide-up': 'slideUp 0.3s ease',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(-20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
