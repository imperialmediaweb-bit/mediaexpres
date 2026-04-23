import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/app/**/*.{ts,tsx,mdx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
    "./content/**/*.{md,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: { DEFAULT: "1rem", sm: "1.5rem", lg: "2rem" },
      screens: { "2xl": "1280px" },
    },
    extend: {
      colors: {
        brand: {
          navy: "#0B2545",
          "navy-dark": "#071A33",
          red: "#D7263D",
          "red-dark": "#B51D31",
          gold: "#E4B363",
          "gold-light": "#F0CE92",
          ivory: "#F8F5F0",
          slate: "#334155",
        },
        border: "hsl(220 14% 90%)",
        input: "hsl(220 14% 90%)",
        ring: "hsl(215 85% 17%)",
        background: "hsl(36 33% 97%)",
        foreground: "hsl(215 28% 17%)",
        primary: { DEFAULT: "#0B2545", foreground: "#F8F5F0" },
        secondary: { DEFAULT: "#F0E8D8", foreground: "#0B2545" },
        muted: { DEFAULT: "hsl(220 14% 96%)", foreground: "hsl(220 9% 46%)" },
        accent: { DEFAULT: "#D7263D", foreground: "#F8F5F0" },
        destructive: { DEFAULT: "#D7263D", foreground: "#F8F5F0" },
        card: { DEFAULT: "#FFFFFF", foreground: "#0B2545" },
        popover: { DEFAULT: "#FFFFFF", foreground: "#0B2545" },
      },
      borderRadius: {
        lg: "12px",
        md: "8px",
        sm: "6px",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        serif: ["var(--font-playfair)", "Georgia", "serif"],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in-up": "fade-in-up 0.6s ease-out forwards",
        "fade-in": "fade-in 0.5s ease-out forwards",
      },
      backgroundImage: {
        "hero-gradient":
          "linear-gradient(135deg, #0B2545 0%, #13396B 50%, #1A4E8F 100%)",
        "cta-gradient":
          "linear-gradient(135deg, #D7263D 0%, #0B2545 100%)",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
};

export default config;
