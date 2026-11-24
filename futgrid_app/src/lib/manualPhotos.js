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
