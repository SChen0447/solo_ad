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
        cream: '#FFF8F0',
        'emotion-happy': '#FFD93D',
        'emotion-sad': '#6C5B7B',
        'emotion-anxious': '#E84545',
        'emotion-calm': '#81B29A',
        'emotion-excited': '#FF6F61',
        'emotion-angry': '#FF4757',
        'emotion-tired': '#A29BFE',
        'emotion-grateful': '#F8B500',
      },
      fontFamily: {
        display: ['ZCOOL KuaiLe', 'cursive'],
        body: ['Noto Sans SC', 'sans-serif'],
      },
      borderRadius: {
        'card': '16px',
      },
      boxShadow: {
        'card': '0 4px 15px rgba(0,0,0,0.08)',
        'card-hover': '0 8px 25px rgba(0,0,0,0.12)',
      },
    },
  },
  plugins: [],
};
