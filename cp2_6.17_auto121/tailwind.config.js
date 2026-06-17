/** @type {import('tailwindcss').Config} */

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        binder: {
          bg: '#f9fafb',
          text: '#1f2937',
          blue: '#3b82f6',
          orange: '#f59e0b',
          red: '#ef4444',
          gray: {
            light: '#f3f4f6',
            mid: '#e5e7eb',
            text: '#6b7280',
            dark: '#9ca3af',
            step: '#374151',
          }
        }
      },
      fontFamily: {
        sans: ['Noto Sans SC', 'DM Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
