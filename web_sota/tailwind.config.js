/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Vendored Apps hub token aliases (APPS_PAGE_STANDARD.md).
        background: '#080a0f',
        foreground: '#f0f6fc',
        card: '#0d1117',
        border: '#30363d',
        muted: '#161b22',
        'muted-foreground': '#8b949e',
        'gh-green': '#22c55e',
        // shadcn-shaped tokens used by vendored Logs/Chat pages.
        primary: '#c9a84c',
        'primary-foreground': '#080a0f',
        secondary: '#27272a',
        'secondary-foreground': '#f0f6fc',
        destructive: '#ef4444',
        ring: '#c9a84c',
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
