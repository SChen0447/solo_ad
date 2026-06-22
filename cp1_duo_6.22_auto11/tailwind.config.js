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
        cinema: {
          bg: '#1a1a2e',
          primary: '#e94560',
          secondary: '#0f3460',
          surface: '#16213e',
          card: '#1f2940',
          border: '#2a3a5c',
          muted: '#8892a8',
          text: '#e2e8f0',
        },
      },
      fontFamily: {
        simhei: ['SimHei', '黑体', 'sans-serif'],
        songti: ['SimSun', '宋体', 'serif'],
        kaiti: ['KaiTi', '楷体', 'serif'],
        georgia: ['Georgia', 'serif'],
        arial: ['Arial', 'sans-serif'],
      },
      boxShadow: {
        inner: 'inset 0 2px 8px rgba(0,0,0,0.4)',
        glow: '0 0 20px rgba(233,69,96,0.3)',
      },
      transitionDuration: {
        '300': '300ms',
      },
      animation: {
        'ripple': 'ripple 0.6s linear',
        'fade-in': 'fadeIn 0.3s ease-in-out',
      },
      keyframes: {
        ripple: {
          '0%': { transform: 'scale(0)', opacity: '0.5' },
          '100%': { transform: 'scale(4)', opacity: '0' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
