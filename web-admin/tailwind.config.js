/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Cairo", "Tajawal", "system-ui", "sans-serif"],
      },
      colors: {
        // Egyptian Steel brand green
        brand: {
          50: "#f3f9eb",
          100: "#e3f1d2",
          200: "#c8e3a8",
          300: "#a6d175",
          400: "#88c14e",
          500: "#7cb342", // lime (primary)
          600: "#5f9230",
          700: "#4a7228",
          800: "#3d5a25",
          900: "#2e7d32", // forest accent
          950: "#1a3514",
        },
        steel: {
          50: "#f6f7f9",
          100: "#eceef2",
          200: "#d5dae3",
          300: "#b0baca",
          400: "#8595ab",
          500: "#667791",
          600: "#516078",
          700: "#424e62",
          800: "#3a4353",
          900: "#1e2430",
          950: "#11151c",
        },
      },
      boxShadow: {
        soft: "0 2px 8px -2px rgba(16,24,40,0.08), 0 4px 16px -4px rgba(16,24,40,0.06)",
        card: "0 1px 3px rgba(16,24,40,0.06), 0 8px 24px -12px rgba(16,24,40,0.12)",
        glow: "0 0 0 1px rgba(124,179,66,0.25), 0 8px 30px -8px rgba(124,179,66,0.35)",
      },
      borderRadius: {
        xl: "0.9rem",
        "2xl": "1.25rem",
      },
      keyframes: {
        "pulse-red": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(239,68,68,0.5)" },
          "50%": { boxShadow: "0 0 0 6px rgba(239,68,68,0)" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "pulse-red": "pulse-red 1.8s ease-in-out infinite",
        marquee: "marquee 40s linear infinite",
        "fade-up": "fade-up 0.4s ease-out both",
        shimmer: "shimmer 1.6s infinite",
      },
    },
  },
  plugins: [],
};
