import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SITE, SITE_NAME, GAMES, ROUTES } from "../src/seo/routes.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const templatePath = path.join(dist, "index.html");

if (!fs.existsSync(templatePath)) {
  console.error("prerender: dist/index.html tapılmadı. Əvvəl `vite build` işlət.");
  process.exit(1);
}

const template = fs.readFileSync(templatePath, "utf8");

if (template.includes('name="robots"')) {
  console.error("prerender: dist artıq emal olunub. Əvvəl `vite build` işlət.");
  process.exit(1);
}

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function setMeta(html, attr, key, content) {
  const tag = `<meta ${attr}="${key}" content="${escapeHtml(content)}" />`;
  const pattern = new RegExp(`<meta\\s+${attr}="${escapeRegExp(key)}"[\\s\\S]*?/?>`);
  return pattern.test(html) ? html.replace(pattern, tag) : html.replace("</head>", `    ${tag}\n  </head>`);
}

function setCanonical(html, url) {
  const tag = `<link rel="canonical" href="${url}" />`;
  const pattern = /<link\s+rel="canonical"[^>]*>/;
  return pattern.test(html) ? html.replace(pattern, tag) : html.replace("</head>", `    ${tag}\n  </head>`);
}

function jsonLd(route, url) {
  const crumbs = [{ name: SITE_NAME, url: `${SITE}/` }];
  if (route.path !== "/") {
    if (route.game) crumbs.push({ name: "Oyunlar", url: `${SITE}/oyunlar` });
    crumbs.push({ name: route.h1, url });
  }
  const graph = [
    {
      "@type": "BreadcrumbList",
      itemListElement: crumbs.map((crumb, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: crumb.name,
        item: crumb.url,
      })),
    },
  ];
  if (route.game) {
    graph.push({
      "@type": "VideoGame",
      name: route.game.title,
      description: route.game.description,
      url,
      genre: route.game.genre,
      inLanguage: ["az", "en", "ru"],
      applicationCategory: "Game",
      operatingSystem: "Any",
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "AZN" },
      publisher: { "@type": "Organization", name: SITE_NAME, url: SITE },
    });
  }
  return `<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@graph": graph })}</script>`;
}

function fallbackContent(route) {
  const links = GAMES.map((game) => `<li><a href="${game.path}">${escapeHtml(game.title)}</a>: ${escapeHtml(game.description)}</li>`).join("");
  const body = [`<h1>${escapeHtml(route.h1)}</h1>`];
  if (route.intro) body.push(`<p>${escapeHtml(route.intro)}</p>`);
  if (route.path === "/" || route.path === "/oyunlar") body.push(`<ul>${links}</ul>`);
  else if (route.game) body.push(`<p><a href="/oyunlar">Bütün oyunlar</a></p>`);
  body.push(`<p><a href="/">FutGrid</a> · <a href="/mexfilik-siyaseti">Məxfilik siyasəti</a> · <a href="/istifade-sertleri">İstifadə şərtləri</a></p>`);
  return `<noscript>${body.join("")}</noscript>`;
}

function render(route) {
  const url = route.path === "/" ? `${SITE}/` : `${SITE}${route.path}`;
  const indexable = route.index !== false;
  let html = template;
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(route.title)}</title>`);
  html = setMeta(html, "name", "description", route.description);
  html = setCanonical(html, url);
  html = setMeta(html, "property", "og:title", route.title);
  html = setMeta(html, "property", "og:description", route.description);
  html = setMeta(html, "property", "og:url", url);
  // Per-game preview image so shared invite links show the game, not the generic card.
  if (route.game) {
    const slug = route.path.split("/").pop();
    if (fs.existsSync(path.join(dist, "og", `${slug}.jpg`))) {
      html = setMeta(html, "property", "og:image", `${SITE}/og/${slug}.jpg`);
    }
  }
  html = setMeta(
    html,
    "name",
    "robots",
    indexable ? "index,follow,max-image-preview:large" : "noindex,nofollow",
  );
  if (indexable) html = html.replace("</head>", `    ${jsonLd(route, url)}\n  </head>`);
  html = html.replace(/<div id="root"><\/div>/, `<div id="root"></div>\n    ${fallbackContent(route)}`);
  return html;
}

function sitemap() {
  const urls = ROUTES.filter((route) => route.index !== false).map((route) => {
    const loc = route.path === "/" ? `${SITE}/` : `${SITE}${route.path}`;
    return `  <url><loc>${loc}</loc><priority>${route.priority ?? "0.5"}</priority></url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
}

let written = 0;
for (const route of ROUTES) {
  const file = route.path === "/" ? templatePath : path.join(dist, route.path, "index.html");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, render(route));
  written += 1;
}
fs.writeFileSync(path.join(dist, "sitemap.xml"), sitemap());
console.log(`prerender: ${written} səhifə və sitemap.xml yazıldı`);
