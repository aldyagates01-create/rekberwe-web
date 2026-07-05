import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0B1120",
        card: "#111827",
        border: "rgba(255,255,255,0.08)",
        accent: {
          purple: "#8B5CF6",
          blue: "#3B82F6",
        },
        success: "#22C55E",
        warning: "#F97316",
        danger: "#EF4444",
      },
      borderRadius: {
        xl: "16px",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      maxWidth: {
        bubble: "75%",
      },
      minHeight: {
        touch: "44px",
      },
      minWidth: {
        touch: "44px",
      },
    },
  },
  plugins: [],
};

export default config;
