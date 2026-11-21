/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#111111",
        paper: "#FFFFFF",
        mist: "#F7F7F7",
        cloud: "#EFEFEF",
        line: "#E3E3E3",
        mid: "#777777",
        strong: "#555555",
        disabled: "#A3A3A3",
        // Gold scale — permitted ONLY inside .public-surface (see design.md §2.2)
        gold: {
          100: "#F6EDDA",
          200: "#EADAB4",
          300: "#DCC287",
          400: "#C9A24B",
          500: "#B8892B",
          600: "#9A701F",
          700: "#7A5716",
        },
        night: "#0B0B0C",
      },
      fontFamily: {
        sans: [
          "Inter Variable",
          "Inter",
          "ui-sans-serif",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono Variable",
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
      },
      maxWidth: {
        public: "1240px",
        workspace: "1440px",
        prose: "68ch",
      },
      borderRadius: {
        card: "14px",
      },
      boxShadow: {
        lift: "0 1px 0 rgba(17,17,17,0.04), 0 8px 24px -12px rgba(17,17,17,0.14)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 180ms ease-out both",
      },
    },
  },
  plugins: [],
};
