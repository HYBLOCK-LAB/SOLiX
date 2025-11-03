import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#0A2540",
          "100": "#0A2540",
          "75": "#475C70",
          "50": "#8492A0",
          "25": "#C2C8CF",
        },
        secondary: {
          DEFAULT: "#14B8A6",
          "100": "#14B8A6",
          "75": "#4FCABC",
          "50": "#8ADCD2",
          "25": "#C4EDE9",
        },
        accent: {
          DEFAULT: "#7C3AED",
          "100": "#7C3AED",
          "75": "#9D6BF2",
          "50": "#BE9CF6",
          "25": "#DECEFA",
        },
        background: {
          light: {
            DEFAULT: "#F8FAFC",
            "100": "#F8FAFC",
            "75": "#FAFBFD",
            "50": "#FCFCFE",
            "25": "#FDFEFE",
          },
          dark: {
            DEFAULT: "#0B1020",
            "100": "#0B1020",
            "75": "#080C18",
            "50": "#060810",
            "25": "#030408",
          },
        },
        surface: {
          light: {
            DEFAULT: "#FFFFFF",
            "100": "#FFFFFF",
            "75": "#FFFFFF",
            "50": "#FFFFFF",
            "25": "#FFFFFF",
          },
          dark: {
            DEFAULT: "#121A2A",
            "100": "#121A2A",
            "75": "#0E1420",
            "50": "#090D15",
            "25": "#04060A",
          },
        },
        text: {
          light: {
            DEFAULT: "#0F172A",
            "100": "#0F172A",
            "75": "#4B515F",
            "50": "#878B94",
            "25": "#C3C5CA",
          },
          dark: {
            DEFAULT: "#E2E8F0",
            "100": "#E2E8F0",
            "75": "#AAAEB4",
            "50": "#717478",
            "25": "#383A3C",
          },
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
    },
  },
};

export default config;
