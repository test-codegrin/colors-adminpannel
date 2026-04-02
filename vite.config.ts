import path from "node:path";

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@filetag": path.resolve(__dirname, "./src"),
    },
  },
  plugins: [react(), tsconfigPaths(), tailwindcss()],
  server: {
    port: 5174,
    strictPort: true,
  },
});

