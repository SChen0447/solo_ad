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
        primary: {
          DEFAULT: '#1e3a5f',
          light: '#2d5a8e',
          dark: '#142a47',
        },
        accent: {
          DEFAULT: '#f6ad55',
          light: '#fbd38d',
          dark: '#e8961e',
        },
        surface: {
          DEFAULT: '#f0f4f8',
          card: '#ffffff',
          hover: 'rgba(30, 58, 95, 0.1)',
        },
        success: '#38a169',
        danger: '#e53e3e',
      },
      borderRadius: {
        DEFAULT: '8px',
      },
      boxShadow: {
        card: '0 4px 12px rgba(0,0,0,0.08)',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
