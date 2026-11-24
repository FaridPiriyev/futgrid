import { readFile, writeFile, access } from "node:fs/promises";
import { gunzipSync } from "node:zlib";

const BASE_URL = "https://pub-e682421888d945d684bcae8890b0ec20.r2.dev/data";
const TARGETS = ["public/data/players.json", "../packages/game-core/data/players.json"];
const IDS = "src/data/player-ids.json";

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const DRY = flag("--dry");

const exists = (p) =>
  access(p).then(
    () => true,
    () => false,
  );

async function loadText(source) {
  let buf;
  if (/^https?:/.test(source)) {
    const res = await fetch(source);
    if (!res.ok) throw new Error(`${source} → HTTP ${res.status}`);
    buf = Buffer.from(await res.arrayBuffer());
  } else {
    buf = await readFile(source);
  }
  if (buf[0] === 0x1f && buf[1] === 0x8b) buf = gunzipSync(buf);
  return buf.toString("utf8").replace(/^﻿/, "");
}

function* csvRows(text) {
  let row = [];
  let field = "";
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') inQ = false;
      else field += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      yield row;
      row = [];
      field = "";
    } else field += ch;
  }
  if (field || row.length) {
    row.push(field);
    yield row;
  }
}

function table(text, wanted) {
  const rows = csvRows(text);
  const head = rows.next().value ?? [];
  const idx = Object.fromEntries(wanted.map((w) => [w, head.indexOf(w)]));
  const missing = wanted.filter((w) => idx[w] < 0);
  if (missing.length) throw new Error(`CSV-də sütun yoxdur: ${missing.join(", ")}`);
  return { rows, idx };
}

const toNum = (s) => {
  const n = Number(s);
  return s !== "" && Number.isFinite(n) && n > 0 ? Math.round(n) : null;
};
const fmt = (eur) => (eur ? `${String(Math.round(eur / 1e5) / 10).replace(".", ",")} mln €` : "—");

async function main() {
  const playersSrc = option("--file") ?? `${BASE_URL}/players.csv.gz`;
  const valuationsSrc = option("--valuations") ?? (option("--file") ? null : `${BASE_URL}/player_valuations.csv.gz`);

  console.log(`Oxunur: ${playersSrc}`);
  const tm = new Map();
  {
    const { rows, idx } = table(await loadText(playersSrc), [
      "player_id",
      "name",
      "market_value_in_eur",
      "highest_market_value_in_eur",
    ]);
    for (const r of rows) {
      const id = r[idx.player_id];
      if (!id) continue;
      tm.set(id, {
        name: r[idx.name],
        value: toNum(r[idx.market_value_in_eur]),
        highest: toNum(r[idx.highest_market_value_in_eur]),
        date: null,
      });
    }
  }
  console.log(`Transfermarkt toplusunda ${tm.size} oyunçu var`);

  if (valuationsSrc) {
    try {
      console.log(`Oxunur: ${valuationsSrc}`);
      const { rows, idx } = table(await loadText(valuationsSrc), ["player_id", "date"]);
      for (const r of rows) {
        const t = tm.get(r[idx.player_id]);
        const d = (r[idx.date] ?? "").slice(0, 10);
        if (t && d && (!t.date || d > t.date)) t.date = d;
      }
    } catch (e) {
      console.log(`Qiymətləndirmə tarixləri oxunmadı (${e.message}) — bugünkü tarix yazılacaq`);
    }
  }

  const ids = JSON.parse(await readFile(IDS, "utf8"));
  const tmOf = new Map();
  for (const [key, ourId] of Object.entries(ids))
    if (key.startsWith("tm:")) tmOf.set(Number(ourId), key.slice(3));

  const players = JSON.parse(await readFile(TARGETS[0], "utf8"));
  const today = new Date().toLocaleDateString("sv-SE");
  let changed = 0,
    same = 0,
    noTm = 0,
    notInSet = 0,
    noValue = 0,
    ourNewer = 0;
  const diffs = [];

  for (const p of players) {
    const tmId = tmOf.get(p.id);
    if (!tmId) {
      noTm++;
      continue;
    }
    const t = tm.get(tmId);
    if (!t) {
      notInSet++;
      continue;
    }
    if (!t.value) {
      noValue++;
      continue;
    }
    const old = p.market_value ?? {};
    if (t.date && old.updated_at && old.updated_at > t.date) {
      ourNewer++;
      continue;
    }
    if (old.amount_eur === t.value) {
      same++;
      continue;
    }
    diffs.push({ name: p.name, from: old.amount_eur ?? 0, to: t.value });
    p.market_value = {
      ...old,
      amount_eur: t.value,
      highest_eur: Math.max(old.highest_eur ?? 0, t.highest ?? 0, t.value),
      updated_at: t.date ?? today,
    };
    changed++;
  }

  diffs.sort((a, b) => Math.abs(b.to - b.from) - Math.abs(a.to - a.from));
  console.log("\nƏn böyük dəyişikliklər:");
  for (const d of diffs.slice(0, 25))
    console.log(`  ${d.name.padEnd(28)} ${fmt(d.from).padStart(12)} → ${fmt(d.to)}`);
  console.log(`
Yenilənəcək: ${changed}
Onsuz da eyni: ${same}
Transfermarkt id-si yoxdur: ${noTm}
Toplusda tapılmadı (adətən aşağı liqalar/təqaüdçülər): ${notInSet}
Toplusda dəyəri yoxdur: ${noValue}
Bizdəki dəyər daha yenidir, toxunulmadı: ${ourNewer}`);

  if (DRY) {
    console.log("\n--dry: heç nə yazılmadı.");
    return;
  }
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
