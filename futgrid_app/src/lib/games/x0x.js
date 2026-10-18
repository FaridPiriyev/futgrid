import { shuffle } from "../random";
import { buildCategoryPool, conflicts } from "./x0xCategories";

export const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export const DIFFICULTY = {
  easy: { minAnswers: 5, maxTier: 1 },
  normal: { minAnswers: 3, maxTier: 2 },
  hard: { minAnswers: 1, maxTier: 3 },
};

const intersectCount = (a, b) => {
  const [s, l] = a.size < b.size ? [a, b] : [b, a];
  let n = 0;
  for (const id of s) if (l.has(id)) n++;
  return n;
};

const intersect = (a, b) => {
  const [s, l] = a.size < b.size ? [a, b] : [b, a];
  const out = [];
  for (const id of s) if (l.has(id)) out.push(id);
  return out;
};

function attempt(pool, maxTier, minAnswers, extraTypes, random, tries) {
  const within = (list) => list.filter((c) => c.tier <= maxTier);
  const clubs = within(pool.club);
  if (clubs.length < 6) return null;
  const extras = Object.fromEntries(
    extraTypes.map((t) => [t, within(pool[t])]),
  );
  const types = extraTypes.filter((t) => extras[t].length);

  for (let t = 0; t < tries; t++) {
    const rows = shuffle(clubs, random).slice(0, 3);
    const cols = [];
    const wanted = types.length ? Math.min(3, 1 + Math.floor(random() * 3)) : 0;
    const slots = shuffle(
      ["club", "club", "club"].map((c, i) =>
        i < wanted ? shuffle(types, random)[0] : c,
      ),
      random,
    );

    let ok = true;
    for (const type of slots) {
      const source = type === "club" ? clubs : extras[type];
      const pick = shuffle(source, random).find(
        (c) =>
          !rows.some((r) => conflicts(r, c)) &&
          !cols.some((x) => conflicts(x, c)) &&
          (c.type === "club" ||
            cols.filter((y) => y.type === c.type).length < 2) &&
          rows.every((r) => intersectCount(r.ids, c.ids) >= minAnswers),
      );
      if (!pick) {
        ok = false;
        break;
      }
      cols.push(pick);
    }
    if (!ok) continue;

    const answers = rows.flatMap((r) =>
      cols.map((c) => intersectCount(r.ids, c.ids)),
    );
    return { rows, cols, answers };
  }
  return null;
}

export function generateGrid(
  data,
  {
    difficulty = "normal",
    categories = {},
    random = Math.random,
    tries = 400,
  } = {},
) {
  const pool = buildCategoryPool(data);
  const { minAnswers, maxTier } = DIFFICULTY[difficulty] ?? DIFFICULTY.normal;
  const extraTypes = ["country", "trophy", "coach"].filter(
    (t) => categories[t] && pool[t]?.length,
  );
  for (let tier = maxTier; tier <= 3; tier++) {
    const grid = attempt(pool, tier, minAnswers, extraTypes, random, tries);
    if (grid) return grid;
  }
  return null;
}

export const cellCats = (grid, cell) => [
  grid.rows[Math.floor(cell / 3)],
  grid.cols[cell % 3],
];

export const matches = (cat, player) => cat.ids.has(player.id);

export function cellAnswers(data, grid, cell) {
  const [r, c] = cellCats(grid, cell);
  return intersect(r.ids, c.ids).map((id) => data.playersById.get(id));
}

export function checkAnswer(grid, cell, player, board) {
  if (board.some((b) => b?.playerId === player.id)) return "used";
  const [r, c] = cellCats(grid, cell);
  return matches(r, player) && matches(c, player) ? "ok" : "wrong";
}

export function winnerOf(board) {
  for (const line of LINES) {
    const [a, b, c] = line;
    if (
      board[a] &&
      board[a].mark &&
      board[a].mark === board[b]?.mark &&
      board[a].mark === board[c]?.mark
    ) {
      return { mark: board[a].mark, line };
    }
  }
  return null;
}

export const isFull = (board) => board.every(Boolean);

export function sampleAnswers(data, grid, cell, board = [], limit = 3) {
  const used = new Set(board.filter(Boolean).map((b) => b.playerId));
  return cellAnswers(data, grid, cell)
    .filter((p) => !used.has(p.id))
    .sort(
      (a, b) =>
        (b.market_value?.amount_eur ?? 0) - (a.market_value?.amount_eur ?? 0),
    )
    .slice(0, limit);
}

export function multipleChoice(data, grid, cell, board, random = Math.random) {
  const used = new Set(board.filter(Boolean).map((b) => b.playerId));
  const [r, c] = cellCats(grid, cell);
  const right = shuffle(
    cellAnswers(data, grid, cell).filter((p) => !used.has(p.id)),
    random,
  )[0];
  if (!right) return [];
  const near = [...r.ids, ...c.ids].filter(
    (id) => !(r.ids.has(id) && c.ids.has(id)),
  );
  const wrong = [];
  for (const id of shuffle(near, random)) {
    const p = data.playersById.get(id);
    if (p && !wrong.includes(p)) wrong.push(p);
    if (wrong.length === 3) break;
  }
  while (wrong.length < 3) {
    const p = data.players[Math.floor(random() * data.players.length)];
    if (!matches(r, p) || !matches(c, p)) if (!wrong.includes(p)) wrong.push(p);
  }
  return shuffle([right, ...wrong], random);
}
