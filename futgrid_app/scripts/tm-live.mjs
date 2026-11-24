import { readFile, writeFile, access } from "node:fs/promises";

const TARGETS = [
  "public/data/players.json",
  "../packages/game-core/data/players.json",
];
const IDS = "src/data/player-ids.json";
const CACHE = "scripts/.tm-live-cache.json";
const CLUBS = "public/data/clubs.json";
const WEEK = 7 * 24 * 3600 * 1000;
const MAX_FAILS_IN_ROW = 8;

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const option = (n, d) => {
  const i = args.indexOf(n);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : d;
};
const API = option("--api", "http://localhost:8000").replace(/\/$/, "");
const LIMIT = Number(option("--limit", 300));
const DELAY = Math.max(1500, Number(option("--delay", 3000)));
const ONLY = option("--only", "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);
const DRY = flag("--dry");
const REFRESH = flag("--refresh");
const ALL = flag("--all");
const CLUB_MODE = flag("--clubs");

const normName = (s) =>
  String(s ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(
      /\b(fc|cf|sc|ac|afc|ssc|as|ss|sv|vfb|vfl|tsg|rc|rcd|cd|ud|sd|ca|club|calcio|de|the)\b/g,
      " ",
    )
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const exists = (p) =>
  access(p).then(
    () => true,
    () => false,
  );
const fmt = (eur) =>
  eur ? `${String(Math.round(eur / 1e5) / 10).replace(".", ",")} mln €` : "—";

function money(v) {
  if (typeof v === "number") return v > 0 ? Math.round(v) : null;
  if (typeof v !== "string") return null;
  let s = v.toLowerCase().replace(/[€\s,]/g, "");
  let mult = 1;
  if (/(m|mio|mln)\.?$/.test(s)) {
    mult = 1e6;
    s = s.replace(/(m|mio|mln)\.?$/, "");
  } else if (/(k|th)\.?$/.test(s)) {
    mult = 1e3;
    s = s.replace(/(k|th)\.?$/, "");
  }
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? Math.round(n * mult) : null;
}

const TROPHY_WEIGHT = {
  ballon_dor: 3,
  world_cup: 1.5,
  ucl: 1,
  euro: 0.8,
  copa_america: 0.8,
  premier_league: 0.3,
  la_liga: 0.3,
  serie_a: 0.3,
  bundesliga: 0.3,
  ligue_1: 0.2,
};
function fame(p) {
  const value = Math.max(
    p.market_value?.amount_eur ?? 0,
    p.market_value?.highest_eur ?? 0,
    1e5,
  );
  const v = Math.max(0, Math.log10(value / 1e6));
  const caps = Math.min(p.international?.caps ?? 0, 150) / 60;
  let t = 0;
  for (const tr of p.trophies ?? [])
    t += (TROPHY_WEIGHT[tr.id] ?? 0) * Math.min(tr.count ?? 1, 5);
  return v * 1.2 + caps + Math.min(t, 6);
}

async function fetchValue(tmId) {
  const res = await fetch(`${API}/players/${tmId}/market_value`, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(30000),
  });
  if (res.status === 404) return { value: null, date: null };
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const history = Array.isArray(data.marketValueHistory)
    ? data.marketValueHistory
    : [];
  const last = history.at(-1);
  const value =
    money(data.marketValue) ?? money(last?.marketValue ?? last?.value);
  const rawDate = last?.date ?? data.updatedAt ?? null;
  let date = null;
  if (typeof rawDate === "string" && /^\d{4}-\d{2}-\d{2}/.test(rawDate))
    date = rawDate.slice(0, 10);
  else if (rawDate && !Number.isNaN(Date.parse(rawDate)))
    date = new Date(rawDate).toLocaleDateString("sv-SE");
  return { value, date };
}

async function getJson(path) {
  const res = await fetch(`${API}${path}`, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(30000),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

const RESERVE =
  /\b(u\s?1[5-9]|u\s?2[0-3]|ii|b|2|reserves?|youth|juniors?|sub-?\d+|primavera|jong|castilla)\b/i;

const CLUB_ALIASES = {
  "Qəbələ FK": "Gabala FK",
  "Zirə FK": "Zira FK",
  "Sumqayıt FK": "Sumgayit FK",
  "Araz-Naxçıvan": "Araz-Nakhchivan",
  "Zenit Saint Petersburg": "Zenit St. Petersburg",
  "Brighton & Hove Albion": "Brighton & Hove Albion",
  "Al Ahli": "Al-Ahli Saudi FC",
  "Al Ahly SC": "Al-Ahly SC",
};
const isReserve = (name) =>
  RESERVE.test(String(name ?? "").replace(/\b(fc|sc)\s?2\b/i, ""));

function searchVariants(name) {
  const plain = String(name)
    .replace(/ø/gi, "o")
    .replace(/æ/gi, "ae")
    .replace(/ə/gi, "e")
    .replace(/ı/g, "i")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
  const noAmp = plain.replace(/&.*$/, "").trim();
  const cleaned = plain
    .replace(/[/&-]/g, " ")
    .replace(
      /\b(FC|SC|AS|OSC|CF|AC|SK|FK|SV|CD|CA|CR|RS|MC|Saint|St\.?)\b/g,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();
  const words = cleaned.split(" ").filter((w) => w.length > 2);
  const alHyphen = /^Al /i.test(plain) ? plain.replace(/^Al /i, "Al-") : null;
  return [
    ...new Set(
      [
        CLUB_ALIASES[name],
        name,
        alHyphen,
        plain,
        noAmp,
        cleaned,
        words.slice(0, 2).join(" "),
        words[0],
      ].filter((v) => v && v.length > 2),
    ),
  ];
}

const similarity = (a, b) => {
  const A = new Set(normName(a).split(" ").filter(Boolean));
  const B = new Set(normName(b).split(" ").filter(Boolean));
  if (!A.size || !B.size) return 0;
  let common = 0;
  for (const w of A) if (B.has(w)) common++;
  return common / Math.max(A.size, B.size);
};

async function findClubId(club) {
  for (const q of searchVariants(club.name)) {
    const data = await getJson(`/clubs/search/${encodeURIComponent(q)}`);
    const results = (Array.isArray(data?.results) ? data.results : []).filter(
      (r) => r?.id && !isReserve(r.name),
    );
    if (results.length) {
      const scored = results
        .map((r) => ({
          r,
          score: similarity(club.name, r.name),
          value: money(r.marketValue) ?? 0,
        }))
        .sort((a, b) => b.score - a.score || b.value - a.value);
      const best = scored[0];
      if (best.score > 0 || q === club.name || q === CLUB_ALIASES[club.name])
        return { id: String(best.r.id), name: best.r.name };
    }
    await sleep(DELAY);
  }
  return null;
}

async function main() {
  try {
    await fetch(`${API}/docs`, { signal: AbortSignal.timeout(5000) });
  } catch {
    console.error(
      `Xəta: ${API} cavab vermir. transfermarkt-api işləyir? (docker ps ilə yoxla)`,
    );
    process.exit(1);
  }

  const players = JSON.parse(await readFile(TARGETS[0], "utf8"));
  const ids = JSON.parse(await readFile(IDS, "utf8"));
  const tmOf = new Map();
  for (const [key, ourId] of Object.entries(ids))
    if (key.startsWith("tm:")) tmOf.set(Number(ourId), key.slice(3));

  const cache = (await exists(CACHE))
    ? JSON.parse(await readFile(CACHE, "utf8"))
    : {};
  const saveCache = () =>
    writeFile(CACHE, JSON.stringify(cache, null, 1) + "\n", "utf8");

  let queue = players.filter((p) => tmOf.has(p.id));
  if (ONLY.length)
    queue = queue.filter((p) =>
      ONLY.some((w) => p.name.toLowerCase().includes(w)),
    );
  else
    queue = queue
      .filter((p) => p.is_active !== false)
      .sort((a, b) => fame(b) - fame(a))
      .slice(0, ALL ? Infinity : LIMIT);

  let stopped = false;
  process.on("SIGINT", () => {
    stopped = true;
    console.log("\nDayandırılır, indiyə qədər yığılanlar saxlanılır…");
  });

  if (CLUB_MODE) {
    const clubs = JSON.parse(await readFile(CLUBS, "utf8"));
    const used = new Set(
      players
        .filter((p) => p.is_active !== false)
        .map((p) => p.current_club_id),
    );
    const list = clubs.filter((c) => used.has(c.id));
    cache.__clubs ??= {};
    console.log(
      `${list.length} klubun heyəti götürüləcək (~${Math.ceil((list.length * 2 * (DELAY + 800)) / 60000)} dəq).`,
    );
    let fails = 0;
    let got = 0;
    for (let i = 0; i < list.length && !stopped; i++) {
      const club = list[i];
      let done = cache.__clubs[club.id];
      if (done && (!done.tm || isReserve(done.tm.name))) done = undefined;
      if (!REFRESH && done?.fetchedAt && Date.now() - done.fetchedAt < WEEK)
        continue;
      try {
        let tmClub = done?.tm;
        if (!tmClub) {
          tmClub = await findClubId(club);
          await sleep(DELAY);
        }
        if (!tmClub) {
          console.log(`\n${club.name}: Transfermarkt-da tapılmadı`);
          continue;
        }
        const squad = await getJson(`/clubs/${tmClub.id}/players`);
        const list2 = Array.isArray(squad?.players) ? squad.players : [];
        for (const pl of list2) {
          const value = money(pl.marketValue);
          if (pl.id)
            cache[String(pl.id)] = { value, date: null, fetchedAt: Date.now() };
        }
        got += list2.length;
        cache.__clubs[club.id] = { tm: tmClub, fetchedAt: Date.now() };
        fails = 0;
        process.stdout.write(
          `\r[${i + 1}/${list.length}] ${club.name.slice(0, 22).padEnd(22)} → ${String(tmClub.name).slice(0, 22).padEnd(22)} ${String(list2.length).padStart(3)} oyunçu   `,
        );
      } catch (e) {
        fails++;
        console.log(`\n${club.name}: ${e.message}`);
        if (fails >= MAX_FAILS_IN_ROW) {
          console.log(
            `\nArdıcıl ${fails} sorğu alınmadı — Transfermarkt müvəqqəti bloklamış ola bilər. Sonra yenidən işlət.`,
          );
          break;
        }
        await sleep(DELAY * 3);
      }
      if ((i + 1) % 10 === 0) await saveCache();
      await sleep(DELAY);
    }
    await saveCache();
    console.log(`\nKlub heyətlərindən ${got} oyunçunun dəyəri götürüldü.`);
    const missing = players.filter(
      (p) => p.is_active !== false && tmOf.has(p.id) && !cache[tmOf.get(p.id)],
    ).length;
    console.log(
      `Heyətlərdə tapılmayan aktiv oyunçu: ${missing} (onlar üçün sonra: node scripts/tm-live.mjs --all)`,
    );
    queue = [];
  }

  const now = Date.now();
  const todo = queue.filter((p) => {
    const c = cache[tmOf.get(p.id)];
    return REFRESH || !c || now - c.fetchedAt > WEEK;
  });
  const minutes = Math.ceil((todo.length * (DELAY + 800)) / 60000);
  if (!CLUB_MODE)
    console.log(
      `${queue.length} oyunçu seçildi, ${todo.length}-i Transfermarkt-dan soruşulacaq (~${minutes} dəq).`,
    );

  let fails = 0;
  for (let i = 0; i < todo.length && !stopped; i++) {
    const p = todo[i];
    const tmId = tmOf.get(p.id);
    try {
      const r = await fetchValue(tmId);
      cache[tmId] = { ...r, fetchedAt: Date.now() };
      fails = 0;
      process.stdout.write(
        `\r[${i + 1}/${todo.length}] ${p.name.slice(0, 26).padEnd(26)} ${fmt(r.value).padStart(12)}   `,
      );
    } catch (e) {
      fails++;
      console.log(`\n${p.name}: ${e.message}`);
      if (fails >= MAX_FAILS_IN_ROW) {
        console.log(
          `\nArdıcıl ${fails} sorğu alınmadı — Transfermarkt müvəqqəti bloklamış ola bilər. Bir neçə saat sonra yenidən işlət.`,
        );
        break;
      }
      await sleep(DELAY * 3);
    }
    if ((i + 1) % 20 === 0) await saveCache();
    await sleep(DELAY);
  }
  await saveCache();
  console.log("");

  const today = new Date().toLocaleDateString("sv-SE");
  const diffs = [];
  let same = 0;
  for (const p of players) {
    if (!tmOf.has(p.id)) continue;
    const c = cache[tmOf.get(p.id)];
    if (!c?.value) continue;
    const old = p.market_value ?? {};
    if (old.amount_eur === c.value) {
      same++;
      continue;
    }
    diffs.push({ name: p.name, from: old.amount_eur ?? 0, to: c.value });
    p.market_value = {
      ...old,
      amount_eur: c.value,
      highest_eur: Math.max(old.highest_eur ?? 0, c.value),
      updated_at: c.date ?? today,
    };
  }

  diffs.sort((a, b) => Math.abs(b.to - b.from) - Math.abs(a.to - a.from));
  console.log("\nDəyişikliklər:");
  for (const d of diffs.slice(0, 40))
    console.log(
      `  ${d.name.padEnd(28)} ${fmt(d.from).padStart(12)} → ${fmt(d.to)}`,
    );
  if (diffs.length > 40) console.log(`  … və daha ${diffs.length - 40}`);
  console.log(`\nYenilənəcək: ${diffs.length}, onsuz da eyni: ${same}`);

  if (DRY) {
    console.log(
      "--dry: players.json yazılmadı (yığılan dəyərlər keşdə saxlandı, təkrar soruşulmayacaq).",
    );
    return;
  }
  if (!diffs.length) return;
  const out = JSON.stringify(players, null, 2) + "\n";
  for (const target of TARGETS) {
    if (!(await exists(target))) continue;
    await writeFile(target, out, "utf8");
    console.log(`Yazıldı: ${target}`);
  }
}

main().catch((e) => {
  console.error(`Xəta: ${e.message}`);
  process.exit(1);
});
