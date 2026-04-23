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
          // New tabloid palette (inspired by Romanian local press)
          red: "#c1121f",
          "red-dark": "#9b111e",
          "red-light": "#e11d2e",
          black: "#111111",
          ink: "#1a1a1a",
          graphite: "#2b2b2b",
          cream: "#faf7f2",
          paper: "#fdfbf7",
          rule: "#e5e5e5",
          gold: "#c9a14a",
          "gold-light": "#e3c57a",
          slate: "#334155",
          // Back-compat aliases so existing components keep rendering
          navy: "#111111",
          "navy-dark": "#000000",
          ivory: "#faf7f2",
        },
        border: "hsl(0 0% 90%)",
        input: "hsl(0 0% 90%)",
        ring: "hsl(355 82% 41%)",
        background: "hsl(36 45% 98%)",
        foreground: "hsl(0 0% 7%)",
        primary: { DEFAULT: "#c1121f", foreground: "#faf7f2" },
        secondary: { DEFAULT: "#111111", foreground: "#faf7f2" },
        muted: { DEFAULT: "hsl(0 0% 96%)", foreground: "hsl(0 0% 40%)" },
        accent: { DEFAULT: "#c1121f", foreground: "#faf7f2" },
        destructive: { DEFAULT: "#9b111e", foreground: "#faf7f2" },
        card: { DEFAULT: "#FFFFFF", foreground: "#111111" },
        popover: { DEFAULT: "#FFFFFF", foreground: "#111111" },
      },
      borderRadius: {
        lg: "12px",
        md: "8px",
        sm: "6px",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        serif: ["var(--font-playfair)", "Georgia", "serif"],
        headline: ["var(--font-oswald)", '"Arial Narrow"', "Impact", "sans-serif"],
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
          "linear-gradient(135deg, #111111 0%, #2b2b2b 55%, #c1121f 100%)",
        "cta-gradient":
          "linear-gradient(135deg, #c1121f 0%, #9b111e 100%)",
        "paper-grain":
          "radial-gradient(circle at 1px 1px, rgba(0,0,0,0.045) 1px, transparent 0)",
      },
      boxShadow: {
        press: "0 10px 30px -10px rgba(193,18,31,0.25)",
        card: "0 4px 20px -4px rgba(17,17,17,0.08)",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
};

export default config;
