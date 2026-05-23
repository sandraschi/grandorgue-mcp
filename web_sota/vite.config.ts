import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  server: {
    port: 11011,
    strictPort: true,
    host: "127.0.0.1",
    proxy: {
      "/api": { target: "http://127.0.0.1:11010", changeOrigin: true },
      "/health": { target: "http://127.0.0.1:11010", changeOrigin: true },
      "/ws": { target: "ws://127.0.0.1:11010", ws: true, changeOrigin: true },
    },
  },
});
