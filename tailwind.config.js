/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./floating.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        kc: {
          bg: "var(--bg-primary)",
          "bg-secondary": "var(--bg-secondary)",
          card: "var(--bg-card)",
          elevated: "var(--bg-elevated)",
          text: "var(--text-primary)",
          "text-secondary": "var(--text-secondary)",
          "text-tertiary": "var(--text-tertiary)",
          accent: "var(--accent)",
          "accent-hover": "var(--accent-hover)",
          "accent-light": "var(--accent-light)",
          border: "var(--border)",
          "border-strong": "var(--border-strong)",
        },
      },
      borderRadius: { card: "14px", btn: "10px" },
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", "SF Pro Display", "Segoe UI", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "SF Mono", "Cascadia Code", "Consolas", "monospace"],
      },
      animation: {
        "fade-in": "fadeIn 250ms ease-out forwards",
        "count-up": "countUp 300ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
        "float-in": "floatIn 300ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
      },
      keyframes: {
        fadeIn: { from: { opacity: "0", transform: "translateY(4px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        countUp: { from: { opacity: "0", transform: "translateY(6px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        floatIn: { from: { opacity: "0", transform: "scale(0.8)" }, to: { opacity: "1", transform: "scale(1)" } },
      },
    },
  },
  plugins: [],
};