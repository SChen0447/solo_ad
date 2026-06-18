/** @type {import('tailwindcss').Config} */

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: '#8d6e63',
        secondary: '#a5d6a7',
        'secondary-hover': '#81c784',
        background: '#faf3e0',
        'booking-card': '#fff8e1',
        'date-highlight': '#b39ddb',
        'status-pending': '#ffd54f',
        'status-picked': '#81c784',
        'status-cancelled': '#bdbdbd',
        'reminder-start': '#fff3e0',
        'reminder-end': '#ffe0b2',
        'chart-bar': '#9575cd',
        'chart-bar-hover': '#7e57c2',
        'border-default': '#bdbdbd',
        'border-focus': '#8d6e63',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 4px 12px rgba(0,0,0,0.08)',
        'card-hover': '0 8px 24px rgba(0,0,0,0.12)',
      },
      backdropBlur: {
        xs: '8px',
      },
      transitionTimingFunction: {
        'ease': 'ease',
      },
    },
  },
  plugins: [],
};
