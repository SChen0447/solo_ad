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
        clay: "#A0522D",
        cream: "#FFF8F0",
        "amber-light": "#D4A017",
        "amber-dark": "#B8860B",
      },
      borderRadius: {
        card: "12px",
      },
      animation: {
        "slide-up": "slideUp 0.5s ease-out forwards",
        "fade-in": "fadeIn 0.3s ease-out forwards",
        "progress-ring": "progressRing 1s ease-out forwards",
      },
      keyframes: {
        slideUp: {
          "0%": { transform: "translateY(30px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        progressRing: {
          "0%": { strokeDashoffset: "var(--ring-circumference)" },
          "100%": { strokeDashoffset: "var(--ring-target-offset)" },
        },
      },
    },
  },
  plugins: [],
};
