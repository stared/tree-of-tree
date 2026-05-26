import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Relative base so the built site works when opened from any subpath
  // (e.g. GitHub Pages, or a plain static file server).
  base: "./",
});
