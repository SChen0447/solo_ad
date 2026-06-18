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
        'space-dark': '#0a0e27',
        'space-blue': '#1a1a2e',
        'tech-blue': '#00ccff',
        'iron-red': '#ff4444',
        'copper-gold': '#ffaa00',
        'titanium-ice': '#00ccff',
        'mountain-gray': '#2c3e50',
        'plain-brown': '#d4a76a',
        'ice-field': '#e0f7fa',
        'station-dark': '#7f8c8d',
        'station-light': '#bdc3c7',
      },
      fontFamily: {
        orbitron: ['Orbitron', 'sans-serif'],
        'noto-sans': ['Noto Sans SC', 'sans-serif'],
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'twinkle': 'twinkle 4s ease-in-out infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 5px currentColor, 0 0 10px currentColor' },
          '50%': { boxShadow: '0 0 20px currentColor, 0 0 30px currentColor' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        twinkle: {
          '0%, 100%': { opacity: 0.3 },
          '50%': { opacity: 1 },
        },
      },
    },
  },
  plugins: [],
};
