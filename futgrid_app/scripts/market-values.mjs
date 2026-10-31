import { readFile, writeFile, access } from "node:fs/promises";

const PLAYERS = "public/data/players.json";
const CLUBS = "public/data/clubs.json";
const IDS = "src/data/player-ids.json";
const CSV = "src/data/market-values.csv";
const SEP = ";";

const exists = (p) =>
  access(p).then(
    () => true,
    () => false,
  );
const readJson = async (p) =>
  JSON.parse((await readFile(p, "utf8")).replace(/^\uFEFF/, ""));

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

function parseMoney(raw) {
  if (raw == null) return null;
  let s = String(raw).trim().toLowerCase().replace(/[€\s]/g, "");
  if (!s) return null;
  let mult = 1e6;
  if (/k$/.test(s)) {
    mult = 1e3;
    s = s.slice(0, -1);
  } else {
    s = s.replace(/(mln|m)$/, "");
  }
  s = s.replace(",", ".");
  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * mult);
}

const fmtM = (eur) =>
  eur ? String(Math.round((eur / 1e6) * 10) / 10).replace(".", ",") : "";

const cell = (v) => {
  const s = String(v ?? "");
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

function parseCsv(text) {
  const rows = [];
  let row = [],
    field = "",
    inQ = false;
  const t = text.replace(/^\uFEFF/, "");
  const sep = t.split("\n")[0].includes(";") ? ";" : ",";
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (inQ) {
      if (ch === '"' && t[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') inQ = false;
      else field += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === sep) {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (ch !== "\r") field += ch;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  const [head, ...body] = rows;
  return body
    .filter((r) => r.some((c) => c.trim()))
    .map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), r[i] ?? ""])));
}

async function readOverrides() {
  if (!(await exists(CSV))) return [];
  return parseCsv(await readFile(CSV, "utf8"));
}

async function exportCsv(limit) {
  const players = await readJson(PLAYERS);
  const clubs = (await exists(CLUBS)) ? await readJson(CLUBS) : [];
  const clubName = new Map(clubs.map((c) => [c.id, c.name]));
  const tmOf = new Map();
  if (await exists(IDS))
    for (const [k, id] of Object.entries(await readJson(IDS)))
      if (k.startsWith("tm:")) tmOf.set(id, k.slice(3));

  const old = new Map((await readOverrides()).map((r) => [String(r.id), r]));
  const top = players
    .filter((p) => p.is_active !== false)
    .sort((a, b) => fame(b) - fame(a))
    .slice(0, limit);
  const ids = new Set(top.map((p) => String(p.id)));
  const extra = players.filter(
    (p) => !ids.has(String(p.id)) && old.get(String(p.id))?.new_m?.trim(),
  );

  const lines = [
    ["id", "name", "club", "current_m", "new_m", "link"].join(SEP),
  ];
  for (const p of [...top, ...extra]) {
    const tm = tmOf.get(p.id);
    const link = tm
      ? `https://www.transfermarkt.com/${p.slug || "-"}/profil/spieler/${tm}`
      : `https://www.transfermarkt.com/schnellsuche/ergebnis/schnellsuche?query=${encodeURIComponent(p.name)}`;
    lines.push(
      [
        p.id,
        p.name,
        clubName.get(p.current_club_id) ?? "",
        fmtM(p.market_value?.amount_eur),
        old.get(String(p.id))?.new_m ?? "",
        link,
      ]
        .map(cell)
        .join(SEP),
    );
  }
  await writeFile(CSV, "\uFEFF" + lines.join("\r\n") + "\r\n", "utf8");
  console.log(`${lines.length - 1} oyunçu yazıldı -> ${CSV}`);
  console.log(
    `"new_m" sütununa yeni dəyəri milyonla yaz (məs. 110 və ya 0,8), sonra: node scripts/market-values.mjs apply`,
  );
}

async function apply() {
  const rows = await readOverrides();
  if (!rows.length) {
    console.log(
      `${CSV} tapılmadı və ya boşdur. Əvvəlcə: node scripts/market-values.mjs export`,
    );
    return;
  }
  const players = await readJson(PLAYERS);
  const byId = new Map(players.map((p) => [String(p.id), p]));
  const today = new Date().toLocaleDateString("sv-SE");
  let changed = 0,
    same = 0;
  const missing = [],
    bad = [];
  for (const r of rows) {
    if (!r.new_m?.trim()) continue;
    const eur = parseMoney(r.new_m);
    if (!eur) {
      bad.push(`${r.name}: "${r.new_m}"`);
      continue;
    }
    const p = byId.get(String(r.id).trim());
    if (!p) {
      missing.push(r.name);
      continue;
    }
    if (p.market_value?.amount_eur === eur) {
      same++;
      continue;
    }
    p.market_value = {
      ...p.market_value,
      amount_eur: eur,
      highest_eur: Math.max(p.market_value?.highest_eur ?? 0, eur),
      updated_at: today,
    };
    p.data_as_of = today.slice(0, 7);
    changed++;
  }
  await writeFile(PLAYERS, JSON.stringify(players, null, 2) + "\n", "utf8");
  console.log(`Yeniləndi: ${changed} oyunçu, onsuz da eyni idi: ${same}`);
  if (missing.length)
    console.log(`Tapılmadı (${missing.length}): ${missing.join(", ")}`);
  if (bad.length) console.log(`Oxunmadı (${bad.length}): ${bad.join(", ")}`);
}

const [cmd = "", arg] = process.argv.slice(2);
if (cmd === "export") await exportCsv(Number(arg) || 400);
else if (cmd === "apply") await apply();
else
  console.log(
    "İstifadə:\n  node scripts/market-values.mjs export [say]\n  node scripts/market-values.mjs apply",
  );
