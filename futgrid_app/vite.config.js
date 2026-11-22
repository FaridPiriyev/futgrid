import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    watch: {
      // ~14 min oyunçu şəklini və xam məlumatı izləməyə ehtiyac yoxdur.
      // Diqqət: izlənməyən qovluğa yeni fayl əlavə olunsa, Vite onu görmür —
      // dev serveri yenidən başlatmaq lazımdır. Ona görə public/images-in
      // özünü (oyun şəkilləri) izləyirik, yalnız ağır alt qovluqları yox.
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
