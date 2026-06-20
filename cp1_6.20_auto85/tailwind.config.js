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
        primary: '#5b9bd5',
        'primary-dark': '#4a8bb5',
        'tech-red': '#ff6b6b',
        'logic-blue': '#48dbfb',
        'complete-green': '#1dd1a1',
        'bg-start': '#eef2f7',
        'bg-end': '#d9e2ec',
        'bubble-bg': '#e6f2ff',
        'nav-text': '#2c3e50',
      },
      fontFamily: {
        poppins: ['Poppins', 'sans-serif'],
      },
      boxShadow: {
        card: '0 4px 12px rgba(0,0,0,0.06)',
      },
      borderRadius: {
        card: '12px',
        bubble: '16px',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'pulse-recording': 'pulseRecording 0.6s ease-in-out infinite',
        'gauge-fill': 'gaugeFill 0.8s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseRecording: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.1)', opacity: '0.8' },
        },
        gaugeFill: {
          '0%': { strokeDashoffset: '283' },
        },
      },
    },
  },
  plugins: [],
};
