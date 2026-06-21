/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: '#FFF8E1',
        amber: '#FFCC80',
        coral: '#FF8A65',
        'coral-dark': '#FF6F00',
        'top-note': '#FFF3E0',
        'middle-note': '#FCE4EC',
        'base-note': '#EFEBE9',
        'workspace-bg': '#FFF8F0',
        'border-warm': '#D7CCC8',
        'like-red': '#E53935',
        'green-start': '#4CAF50',
        'green-end': '#2E7D32',
      },
      fontFamily: {
        display: ['Playfair Display', 'serif'],
        body: ['Noto Sans SC', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
