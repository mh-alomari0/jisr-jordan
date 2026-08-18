import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#0284C7",
          hover: "#0369A1",
          light: "#E0F2FE",
        },
        secondary: {
          DEFAULT: "#EA580C",
          hover: "#C2410C",
        },
        neutral: {
          surface: "#F8FAFC",
          card: "#FFFFFF",
          border: "#E2E8F0",
          text: "#0F172A",
          muted: "#334155",
        },
        status: {
          success: "#16A34A",
          warning: "#CA8A04",
          info: "#2563EB",
          error: "#DC2626",
        },
      },
      fontFamily: {
        cairo: ["var(--font-cairo)", "sans-serif"],
      },
      borderRadius: {
        btn: "12px",
        card: "16px",
      },
    },
  },
  plugins: [],
};

export default config;