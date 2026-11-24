import { mkdir, readFile, writeFile } from "node:fs/promises";

const players = JSON.parse(await readFile("public/data/players.json", "utf8"));
const clubs = JSON.parse(await readFile("public/data/clubs.json", "utf8"));
const clubName = new Map(clubs.map((c) => [c.id, c.name]));
const value = (p) => Math.max(p.market_value?.amount_eur ?? 0, p.market_value?.highest_eur ?? 0);

let only = null;
if (process.argv.includes("--unverified")) {
  try {
    only = new Set(JSON.parse(await readFile("data-raw/unverified-photos.json", "utf8")));
  } catch {
    console.error("data-raw/unverified-photos.json yoxdur — əvvəlcə: node scripts/photos-add.mjs --dry");
    process.exit(1);
  }
}

const rows = players
  .filter((p) => p.photo_url && (!only || only.has(p.slug)))
  .sort((a, b) => value(b) - value(a))
  .map((p) => ({
    n: p.name,
    s: p.slug,
    u: p.photo_url.startsWith("/") ? `../public${p.photo_url}` : p.photo_url,
    c: clubName.get(p.current_club_id) ?? "",
    y: p.birth_date?.slice(0, 4) ?? "",
    f: p.nationality_code ?? "",
  }));

const html = `<!doctype html>
<html lang="az"><head><meta charset="utf-8"><title>FutGrid — oyunçu şəkilləri (${rows.length})</title>
<style>
body{margin:0;font:14px system-ui,sans-serif;background:#0b0e14;color:#e5e7eb}
header{position:sticky;top:0;z-index:2;display:flex;gap:12px;align-items:center;flex-wrap:wrap;padding:12px 16px;background:#111827;border-bottom:1px solid #1f2937}
input{padding:8px 10px;border-radius:8px;border:1px solid #374151;background:#0b0e14;color:#fff;width:240px}
button{padding:8px 14px;border-radius:8px;border:0;background:#2563eb;color:#fff;font-weight:700;cursor:pointer}
#grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px;padding:16px}
.c{background:#111827;border:2px solid transparent;border-radius:10px;overflow:hidden;cursor:pointer}
.c.bad{border-color:#ef4444;opacity:.75}
.c img{width:100%;aspect-ratio:3/4;object-fit:cover;object-position:top;display:block;background:#1f2937}
.c div{padding:6px 8px;line-height:1.3}.c b{display:block;font-size:13px}.c small{color:#9ca3af;font-size:11px}
</style></head><body>
<header>
<strong>${rows.length} şəkil</strong>
<input id="q" placeholder="Ad və ya klub axtar…">
<span id="cnt">0 səhv seçilib</span>
<button id="copy">Siyahını kopyala</button>
<button id="clear" style="background:#374151">Seçimləri sıfırla</button>
<small style="color:#9ca3af">Səhv şəklə klik et → qırmızı olur</small>
</header>
<div id="grid"></div>
<script>
const ROWS=${JSON.stringify(rows)};
const KEY="fg-bad-photos";
const bad=new Set(JSON.parse(localStorage.getItem(KEY)||"[]"));
const grid=document.getElementById("grid"),q=document.getElementById("q"),cnt=document.getElementById("cnt");
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
function render(){
  const t=q.value.trim().toLowerCase();
  const list=t?ROWS.filter(r=>(r.n+" "+r.c).toLowerCase().includes(t)):ROWS;
  grid.innerHTML=list.map(r=>'<div class="c'+(bad.has(r.n)?' bad':'')+'" data-n="'+esc(r.n)+'"><img loading="lazy" src="'+esc(r.u)+'"><div><b>'+esc(r.n)+'</b><small>'+esc(r.c)+' · '+r.y+' · '+r.f+'</small></div></div>').join("");
  cnt.textContent=bad.size+" səhv seçilib";
}
grid.onclick=e=>{const c=e.target.closest(".c");if(!c)return;const n=c.dataset.n;bad.has(n)?bad.delete(n):bad.add(n);c.classList.toggle("bad");localStorage.setItem(KEY,JSON.stringify([...bad]));cnt.textContent=bad.size+" səhv seçilib";};
q.oninput=render;
document.getElementById("copy").onclick=async()=>{await navigator.clipboard.writeText([...bad].join("\\n"));alert(bad.size+" ad kopyalandı — bad-photos.txt-ə yapışdır");};
document.getElementById("clear").onclick=()=>{if(confirm("Bütün seçimlər silinsin?")){bad.clear();localStorage.removeItem(KEY);render();}};
render();
</script></body></html>`;

await mkdir("data-raw", { recursive: true });
await writeFile("data-raw/photo-sheet.html", html, "utf8");
console.log(`Hazırdır: data-raw/photo-sheet.html (${rows.length} şəkil). Faylı brauzerdə aç.`);
