/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        organ: {
          gold: "#c9a84c",
          wood: "#5c3a21",
          ivory: "#f5f0e8",
          stop: "#8b0000",
          pipe: "#c0c0c0",
        },
      },
      fontFamily: {
        stop: ['"Times New Roman"', "serif"],
      },
    },
  },
  plugins: [],
};
