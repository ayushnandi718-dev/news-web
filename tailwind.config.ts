import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#c8102e",
          dark: "#8f0b20",
          ink: "#0f172a",
        },
        paper: "#f7f5f0",
        ink: "#131c2e",
      },
      fontFamily: {
        bengali: [
          "var(--font-bengali)",
          "IBM Plex Sans Bengali",
          "Noto Sans Bengali",
          "Hind Siliguri",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
      },
      keyframes: {
        ticker: {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(-100%)" },
        },
        pulseDot: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.35" },
        },
      },
      animation: {
        ticker: "ticker 40s linear infinite",
        pulseDot: "pulseDot 1.2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
