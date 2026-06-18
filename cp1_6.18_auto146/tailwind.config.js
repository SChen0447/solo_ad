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
        'bg-primary': '#1a1a2e',
        'bg-card': '#16213e',
        'text-primary': '#e0e0e0',
        'accent': '#ff6b35',
        'accent-hover': 'rgba(255,107,53,0.1)',
        'accent-selected': 'rgba(255,107,53,0.2)',
        'border-dim': '#666666',
        'grid-line': '#e0e0e0',
      },
      fontFamily: {
        'mono': ['JetBrains Mono', 'monospace'],
        'sans': ['Noto Sans SC', 'sans-serif'],
      },
      animation: {
        'pulse-glow': 'pulseGlow 0.5s ease-in-out infinite',
        'spin-slow': 'spin 0.6s linear infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(255,107,53,0.4)' },
          '50%': { boxShadow: '0 0 0 12px rgba(255,107,53,0)' },
        },
      },
    },
  },
  plugins: [],
};
