import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      boxShadow: {
        soft: "0 10px 30px rgba(15, 23, 42, 0.08)",
        softHover: "0 16px 40px rgba(15, 23, 42, 0.12)"
      },
      colors: {
        surface: "hsl(var(--surface))",
        muted: "hsl(var(--muted))",
        line: "hsl(var(--line))",
        foreground: "hsl(var(--foreground))",
        accent: "hsl(var(--accent))",
        accent2: "hsl(var(--accent2))"
      },
      borderRadius: {
        "2xl": "1.25rem"
      }
    }
  },
  plugins: []
};

export default config;
