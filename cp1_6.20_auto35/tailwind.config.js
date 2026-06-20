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
        'deep-navy': '#1a1a2e',
        'mid-navy': '#16213e',
        'bright-navy': '#0f3460',
        'accent': '#e94560',
        'accent-hover': '#ff6b81',
        'branch-orange': '#e94560',
        'branch-green': '#2ecc71',
        'branch-purple': '#9b59b6',
      },
      fontFamily: {
        'display': ['Playfair Display', 'serif'],
        'body': ['Noto Sans SC', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace'],
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      animation: {
        'slide-up': 'slideUp 300ms cubic-bezier(0.4, 0, 0.2, 1)',
        'fade-in': 'fadeIn 200ms ease-out',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
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
