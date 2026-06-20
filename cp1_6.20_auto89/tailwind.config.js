/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'bg-dark': '#1e1e2e',
        'card-bg': 'rgba(255,255,255,0.08)',
        'text-light': '#e0e0e0',
        'primary': '#4a90d9',
        'primary-dark': '#357abd',
        'beige': '#f5f0e8',
        'night': '#2c2c2c',
        'highlight': '#f1c40f',
        'stroke': 'rgba(255,255,255,0.1)'
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif']
      },
      boxShadow: {
        'card': '0 4px 6px rgba(0, 0, 0, 0.3)',
        'card-hover': '0 8px 16px rgba(0, 0, 0, 0.4)',
        'modal': '0 8px 32px rgba(0, 0, 0, 0.2)'
      },
      backdropBlur: {
        xs: '2px'
      }
    }
  },
  plugins: []
};
