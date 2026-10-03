import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: "var(--card)",
        "card-foreground": "var(--card-foreground)",
        muted: "var(--muted)",
        "muted-foreground": "var(--muted-foreground)",
        subtle: "var(--subtle)",
        border: "var(--border)",
        "border-strong": "var(--border-strong)",
        ring: "var(--ring)",
        "status-green": "var(--status-green)",
        "status-green-bg": "var(--status-green-bg)",
        "status-red": "var(--status-red)",
        "status-red-bg": "var(--status-red-bg)",
        "status-orange": "var(--status-orange)",
        "status-orange-bg": "var(--status-orange-bg)",
        "status-blue": "var(--status-blue)",
        "status-blue-bg": "var(--status-blue-bg)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.125rem",
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.03)",
        pop: "0 4px 6px -2px rgba(0,0,0,0.05), 0 10px 30px -10px rgba(0,0,0,0.18)",
        modal: "0 8px 12px -4px rgba(0,0,0,0.08), 0 24px 60px -12px rgba(0,0,0,0.28)",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        shimmer: "shimmer 1.6s linear infinite",
      },
    },
  },
  plugins: [],
};
export default config;
