import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

// Static SPA build for Capacitor (native iOS). This deliberately does NOT use
// @lovable.dev/vite-tanstack-config: no SSR, no nitro server, no /api routes.
// Run with: bun run build:capacitor
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      // Named key "index" so the emitted file is dist/index.html.
      input: { index: path.resolve(__dirname, "index.capacitor.html") },
    },
  },
});
