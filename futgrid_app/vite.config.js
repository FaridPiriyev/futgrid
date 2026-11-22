import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    watch: {
      // ~14 min oyunçu şəklini və xam məlumatı izləməyə ehtiyac yoxdur —
      // bunlar dəyişəndə səhifəni əl ilə yeniləmək kifayətdir.
      ignored: [
        "**/public/images/**",
        "**/public/data/**",
        "**/data-raw/**",
        "**/scripts/**",
      ],
    },
  },
});
