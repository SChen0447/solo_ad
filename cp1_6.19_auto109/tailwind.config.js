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
        'sm-primary': '#1a1a2e',
        'sm-secondary': '#16213e',
        'sm-accent': '#0f3460',
        'sm-action': '#e94560',
        'sm-action-hover': '#ff6b81',
        'sm-text': '#e0e0e0',
        'sm-text-muted': '#a0a0b0',
      },
      fontFamily: {
        'heading': ['Outfit', 'sans-serif'],
        'body': ['DM Sans', 'sans-serif'],
      },
      boxShadow: {
        'glow': '0 0 20px rgba(15, 52, 96, 0.5)',
        'glow-hover': '0 0 30px rgba(15, 52, 96, 0.8)',
        'glow-action': '0 0 15px rgba(233, 69, 96, 0.4)',
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.5s ease-out forwards',
        'fade-in': 'fadeIn 0.3s ease-out forwards',
        'fade-out': 'fadeOut 0.5s ease-in forwards',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'slide-in-right': 'slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 10px rgba(233, 69, 96, 0.4)' },
          '50%': { boxShadow: '0 0 25px rgba(233, 69, 96, 0.8)' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
};
