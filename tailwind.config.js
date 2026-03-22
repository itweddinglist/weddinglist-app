/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: "var(--navy)",
        "navy-card": "var(--navy-card)",
        ivory: "var(--ivory)",
        cream: "var(--cream)",
        "cream-line": "var(--cream-line)",
        rose: "var(--rose)",
        "rose-hover": "var(--rose-hover)",
        "rose-light": "var(--rose-light)",
        muted: "var(--muted)",
      },
      fontFamily: {
        display: "var(--font-display)",
        body: "var(--font-body)",
      },
    },
  },
  plugins: [],

  // Safelist policy — nu generăm clase din stringuri dinamice
  safelist: [],
};

export default config;