import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const UA =
  "FutgridImageFetcher/1.1 (https://futgrid.az; football quiz game image sync)";
const DELAY = 1000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const exists = (p) =>
  access(p).then(
    () => true,
    () => false,
  );
const readJson = async (p, fallback) =>
  (await exists(p))
    ? JSON.parse((await readFile(p, "utf8")).replace(/^\uFEFF/, ""))
    : fallback;
const writeJson = (p, v) =>
  writeFile(p, JSON.stringify(v, null, 2) + "\n", "utf8");

let fetchImpl = (...a) => fetch(...a);
export const setFetch = (fn) => {
  fetchImpl = fn;
};

const extOf = (url) => {
  const e = path.extname(new URL(url).pathname).toLowerCase();
  if (e === ".jpeg") return ".jpg";
  return [".jpg", ".png", ".webp", ".gif"].includes(e) ? e : ".jpg";
};

class Blocked extends Error {}

async function grab(url) {
  for (let attempt = 0; attempt < 4; attempt++) {
    let res;
    try {
      res = await fetchImpl(url, { headers: { "User-Agent": UA } });
    } catch {
      await sleep(5000 * (attempt + 1));
      continue;
    }
    if (res.ok) {
      const type = res.headers.get("content-type") ?? "";
      if (type && !type.startsWith("image/"))
        throw new Error(`şəkil deyil (${type})`);
      return Buffer.from(await res.arrayBuffer());
    }
    if (res.status === 404 || res.status === 400)
      throw new Error(`HTTP ${res.status}`);
    if (res.status === 429 || res.status >= 500) {
      const wait = Math.max(
        (Number(res.headers.get("retry-after")) || 0) * 1000,
        30000 * 2 ** attempt,
      );
      console.log(
        `\n   ...Wikimedia gözlət dedi (HTTP ${res.status}), ${Math.round(wait / 1000)} san. gözləyirəm`,
      );
      await sleep(wait);
      continue;
    }
    throw new Error(`HTTP ${res.status}`);
  }
  throw new Blocked("çox sayda 429");
}

export async function run({ kind, root = ".", delay = DELAY } = {}) {
  if (!["players", "coaches"].includes(kind))
    throw new Error(
      "İstifadə: node scripts/download-images.mjs players|coaches",
    );
  const P = (p) => path.join(root, p);
  const mapPath = P(`data-raw/images/${kind}.json`);
  const map = await readJson(mapPath, null);
  if (!map)
    throw new Error(
      `${mapPath} tapılmadı. Əvvəlcə fetch-images.mjs işə salın.`,
    );
  const outDir = P(`public/images/${kind}`);
  await mkdir(outDir, { recursive: true });

  const todo = Object.entries(map).filter(([, url]) =>
    /^https?:\/\//.test(url),
  );
  console.log(
    `${kind}: ${Object.keys(map).length} şəkildən ${todo.length} hələ link kimidir, endirilir...`,
  );

  let done = 0,
    failed = 0,
    stopped = false;
  for (const [slug, url] of todo) {
    try {
      const file = `${slug}${extOf(url)}`;
      if (!(await exists(path.join(outDir, file)))) {
        await writeFile(path.join(outDir, file), await grab(url));
        await sleep(delay);
      }
      map[slug] = `/images/${kind}/${file}`;
      done++;
    } catch (e) {
      if (e instanceof Blocked) {
        stopped = true;
        break;
      }
      failed++;
    }
    process.stdout.write(
      `\r   ${done + failed}/${todo.length} · endirildi: ${done} · alınmadı: ${failed}`,
    );
    if ((done + failed) % 25 === 0) await writeJson(mapPath, map);
  }
  process.stdout.write("\n");
  await writeJson(mapPath, map);

  const dataPath = P(`public/data/${kind}.json`);
  const all = await readJson(dataPath, null);
  if (all) {
    for (const p of all) if (map[p.slug]) p.photo_url = map[p.slug];
    await writeJson(dataPath, all);
  }
  console.log(
    `Hazırdır: ${done} şəkil ${outDir} qovluğuna endirildi.${failed ? ` ${failed} şəkil alınmadı, link kimi qaldı.` : ""}`,
  );
  if (stopped)
    console.log(
      "Wikimedia müvəqqəti blokladı. Təxminən 1 saatdan sonra eyni əmri yenidən işə salın, qaldığı yerdən davam edəcək.",
    );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  run({ kind: process.argv[2] }).catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
