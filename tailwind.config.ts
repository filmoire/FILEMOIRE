import type { Config } from "tailwindcss";

/** Jetons de la charte Filémoire (dossier de déploiement, diapositive 4). */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        prune: { DEFAULT: "#4C253B", 700: "#3A1B2D", 600: "#5E3049", 100: "#EADBE3", 50: "#F6EFF3" },
        terre: { DEFAULT: "#B65D45", 700: "#96472F", 100: "#F3DDD5", 50: "#FBF0EB" },
        or: { DEFAULT: "#C6A57E", 700: "#8A6C45", 100: "#EFE3D3", 50: "#F8F2EA" },
        creme: { DEFAULT: "#FBF7F0", 200: "#F4EDE2", 300: "#EDE3D4" },
        ink: { DEFAULT: "#34202D", muted: "#6E5D68", soft: "#8F808A" },
        line: "#E5D9C9",
        success: { DEFAULT: "#2E6A4E", bg: "#E6F2EA" },
        warning: { DEFAULT: "#7A4E00", bg: "#FFF3D9" },
        danger: { DEFAULT: "#A23B2E", bg: "#FBE8E4" },
        info: { DEFAULT: "#2D5D79", bg: "#E6EFF5" },
      },
      fontFamily: {
        serif: ['"EB Garamond"', "Garamond", "Georgia", "serif"],
        sans: ["Inter", "system-ui", "-apple-system", '"Segoe UI"', "sans-serif"],
      },
      borderRadius: { DEFAULT: "6px", md: "8px", lg: "10px", xl: "14px" },
      boxShadow: {
        soft: "0 1px 2px rgba(52,32,45,.05), 0 2px 8px rgba(52,32,45,.06)",
        lift: "0 10px 30px -12px rgba(52,32,45,.25)",
        book: "0 1px 1px rgba(52,32,45,.08), 0 18px 40px -18px rgba(52,32,45,.45)",
      },
      keyframes: {
        "fade-up": { from: { opacity: "0", transform: "translateY(6px)" }, to: { opacity: "1", transform: "none" } },
        pulse2: { "0%,100%": { opacity: "1" }, "50%": { opacity: ".35" } },
      },
      animation: { "fade-up": "fade-up .35s ease-out both", pulse2: "pulse2 1.2s ease-in-out infinite" },
    },
  },
  plugins: [],
};
export default config;
