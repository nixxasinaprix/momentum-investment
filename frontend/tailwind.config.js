/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["'Plus Jakarta Sans'", "Inter", "sans-serif"],
      },
      colors: {
        brand: {
          plum: "#6E3559",
          plumHover: "#5D2C4B",
          plumDark: "#8C4570",
          plumDarkHover: "#7A3B61",
          coral: "#F0867C",
          gold: "#E3C87D",
          goldPale: "#F5DFA0",
          mauve: "#C77FB0",
        },
        surface: {
          cream: "#F5F2EA",
          night: "#07080F",
          nightAlt: "#0B0D17",
          cardDark: "#1E1723",
        },
      },
      borderRadius: {
        auth: "24px",
        panel: "28px",
        control: "14px",
      },
      boxShadow: {
        "plum-glow": "0 10px 25px -5px rgba(110, 53, 89, 0.30)",
        "plum-glow-dark": "0 10px 25px -5px rgba(140, 69, 112, 0.30)",
        "auth-card": "0 30px 90px -30px rgba(0, 0, 0, 0.80)",
        "float-control": "0 8px 24px rgba(0, 0, 0, 0.14)",
      },
      transitionTimingFunction: {
        momentum: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};
