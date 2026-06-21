/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/frontend/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        earth: {
          50: '#FDFBF7',
          100: '#F8F5F0',
          200: '#F0E9DD',
          300: '#E5DAC8',
          400: '#D4C9B8',
          500: '#B8A88A',
          600: '#A6977A',
          700: '#8B7E6A',
          800: '#6B5E4E',
          900: '#5C5040',
        },
        sage: {
          50: '#F3F6F1',
          100: '#E6EDE3',
          300: '#AFC0A4',
          500: '#8F9E87',
          600: '#7A8972',
          700: '#63725C',
        },
      },
      borderRadius: {
        '2xl': '1rem',
      },
      boxShadow: {
        md: '0 4px 12px rgba(92, 80, 64, 0.08)',
        lg: '0 8px 24px rgba(92, 80, 64, 0.12)',
      },
    },
  },
  plugins: [],
};
