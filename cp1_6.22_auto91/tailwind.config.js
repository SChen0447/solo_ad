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
        cream: '#fffff0',
        'warm-orange': '#ed8936',
        'warm-beige': '#fefcbf',
        'star-gold': '#f6ad55',
        'star-empty': '#e2e8f0',
        'teal-dark': '#319795',
        'green-start': '#48bb78',
        'green-end': '#38a169',
      },
      fontFamily: {
        serif: ['Georgia', 'serif'],
        sans: ['system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.3s ease forwards',
        'ripple': 'ripple 0.6s ease-out',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        ripple: {
          '0%': { transform: 'scale(0)', opacity: '0.5' },
          '100%': { transform: 'scale(4)', opacity: '0' },
        },
      },
    },
  },
  plugins: [],
};
