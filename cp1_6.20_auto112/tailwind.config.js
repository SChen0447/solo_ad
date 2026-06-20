/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-dark': '#2c3e50',
        'brand-accent': '#e67e22',
        'brand-accent-hover': '#d35400',
        'status-pending': '#f39c12',
        'status-production': '#3498db',
        'status-quality': '#9b59b6',
        'status-shipping': '#2ecc71',
        'status-completed': '#95a5a6',
        'input-bg': '#f9f9f9',
        'border-default': '#bdc3c7',
        'border-light': '#ecf0f1',
      },
      fontFamily: {
        sans: ['"Noto Sans SC"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 2px 8px rgba(44, 62, 80, 0.06)',
        'card-hover': '0 8px 24px rgba(44, 62, 80, 0.15)',
        'glow-accent': '0 0 0 3px rgba(230, 126, 34, 0.25)',
        'glow-pending': '0 0 12px rgba(243, 156, 18, 0.5)',
        'glow-production': '0 0 12px rgba(52, 152, 219, 0.5)',
        'glow-quality': '0 0 12px rgba(155, 89, 182, 0.5)',
        'glow-shipping': '0 0 12px rgba(46, 204, 113, 0.5)',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-40rem 0' },
          '100%': { backgroundPosition: '40rem 0' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
      animation: {
        shimmer: 'shimmer 2s linear infinite',
        fadeIn: 'fadeIn 0.3s ease-out',
      },
    },
  },
  plugins: [],
}
