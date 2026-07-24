import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  optimizeDeps: { exclude: ["@coderline/alphatab"] },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  server: {
    allowedHosts: ["goliath"],
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
