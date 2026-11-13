// Əl ilə əlavə olunan oyunçu şəkilləri.
// Şəkli src/assets/players/ qovluğuna oyunçunun adı ilə at (məs. jordi-alba.webp),
// sayt onu avtomatik tapır. Başqa heç nə yazmaq lazım deyil.
const files = import.meta.glob("../assets/players/*.{webp,jpg,jpeg,png,avif}", {
  eager: true,
  import: "default",
});

export const MANUAL_PHOTOS = Object.fromEntries(
  Object.entries(files).map(([path, url]) => [
    path.split("/").pop().replace(/\.[^.]+$/, ""),
    url,
  ]),
);
