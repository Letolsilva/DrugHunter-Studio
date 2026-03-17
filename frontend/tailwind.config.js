module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  plugins: [],
  theme: {
    extend: {
      colors: {
        "surface-primary": "#0a0e1a",
        "surface-secondary": "#0f1623",
        panel: "#141c2e",
        "panel-hover": "#1a2440",
        outline: "#1e2d4a",
        "outline-strong": "#253652",
        foreground: "#e2e8f0",
        "foreground-muted": "#94a3b8",
        "foreground-subtle": "#4a6080",
        accent: {
          DEFAULT: "#00d4aa",
          hover: "#00bfa0",
          12: "rgba(0,212,170,0.12)",
          15: "rgba(0,212,170,0.15)",
          25: "rgba(0,212,170,0.25)",
          30: "rgba(0,212,170,0.3)",
          muted: "rgba(0,212,170,0.25)",
        },
        blue: {
          DEFAULT: "#3b82f6",
          12: "rgba(59,130,246,0.12)",
          15: "rgba(59,130,246,0.15)",
          25: "rgba(59,130,246,0.25)",
          30: "rgba(59,130,246,0.3)",
        },
        red: {
          DEFAULT: "#ef4444",
          12: "rgba(239,68,68,0.12)",
          15: "rgba(239,68,68,0.15)",
          30: "rgba(239,68,68,0.3)",
        },
        yellow: {
          DEFAULT: "#f59e0b",
          12: "rgba(245,158,11,0.12)",
          15: "rgba(245,158,11,0.15)",
          25: "rgba(245,158,11,0.25)",
          30: "rgba(245,158,11,0.3)",
        },
      },
      backgroundImage: {
        "app-grid":
          "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
      },
      boxShadow: {
        menu: "0 8px 24px rgba(0,0,0,0.4)",
        "accent-glow": "0 0 10px rgba(0,212,170,0.3)",
        "yellow-glow": "0 0 10px rgba(245,158,11,0.3)",
      },
      borderRadius: {
        DEFAULT: "8px",
        lg: "12px",
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Fira Code", "Cascadia Code", "monospace"],
      },
    },
  },
};
