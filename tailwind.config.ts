import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#02040b",
        panel: "#0a1020",
        electric: "#1687ff",
        violet: "#7657ff",
      },
      boxShadow: {
        glow: "0 0 35px rgba(22,135,255,.28)",
        card: "0 20px 55px rgba(0,0,0,.35)",
      },
      animation: {
        float: "float 5s ease-in-out infinite",
        pulseSoft: "pulseSoft 2.4s ease-in-out infinite",
      },
      keyframes: {
        float: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-6px)" } },
        pulseSoft: { "0%,100%": { opacity: ".65" }, "50%": { opacity: "1" } },
      },
    },
  },
  plugins: [],
} satisfies Config;
