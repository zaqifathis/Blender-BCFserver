import { defineConfig } from "vite";
import preact from "@preact/preset-vite";

// Blender serves web/dist on the WebSocket port; `npm run dev` proxies to it.
export default defineConfig({
  plugins: [preact()],
  base: "./",
  build: { outDir: "dist", emptyOutDir: true },
  server: { proxy: { "/ws": { target: "ws://localhost:8765", ws: true }, "/api": "http://localhost:8765" } },
});
