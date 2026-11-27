import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Changes on every build. Used to bust the browser cache of /data/*.json and shown in the footer
// so it is easy to check which version is live.
const BUILD_ID = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: { __BUILD_ID__: JSON.stringify(BUILD_ID) },
  server: {
    watch: {
      ignored: [
        "**/public/images/players/**",
        "**/public/images/coaches/**",
        "**/public/data/**",
        "**/data-raw/**",
        "**/scripts/**",
      ],
    },
  },
});
