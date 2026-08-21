/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#ebe6dc",
        paper: "#f7f4ee",
        info: "#3d5a6c",
        risk: {
          low: "#4d7c5a",
          moderate: "#a68b2b",
          heavy: "#c06a2c",
          extreme: "#a33b32",
        },
      },
      fontFamily: {
        sans: ["IBM Plex Sans", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "monospace"],
      },
      borderRadius: {
        sm: "2px",
      },
    },
  },
  plugins: [],
};
