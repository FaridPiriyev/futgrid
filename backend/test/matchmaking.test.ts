import { describe, expect, it } from "vitest";
import { compatible, findPairs, ratingWindow, type QueueEntry } from "../src/modules/duel/matchmaking.js";

const NOW = 1_000_000;
const entry = (id: string, rating: number, waitedMs = 0, extra: Partial<QueueEntry> = {}): QueueEntry => ({
  id,
  socketId: `s-${id}`,
  rating,
  guest: false,
  joinedAt: NOW - waitedMs,
  name: id,
  ...extra,
});

describe("matchmaking", () => {
  it("Elo pəncərəsi gözlədikcə genişlənir", () => {
    expect(ratingWindow(0)).toBe(150);
    expect(ratingWindow(10_000)).toBe(450);
    expect(ratingWindow(45_000)).toBe(Number.POSITIVE_INFINITY);
  });

  it("reytinqi yaxın olanları birləşdirir", () => {
    const pairs = findPairs([entry("a", 1000), entry("b", 1500), entry("c", 1050), entry("d", 1480)], NOW);
    const ids = pairs.map(([x, y]) => [x.id, y.id].sort().join("+")).sort();
    expect(ids).toEqual(["a+c", "b+d"]);
  });

  it("çox fərqli reytinqlər dərhal birləşmir, gözləyəndən sonra birləşir", () => {
    expect(findPairs([entry("a", 1000), entry("b", 1600)], NOW)).toHaveLength(0);
    expect(findPairs([entry("a", 1000, 45_000), entry("b", 1600)], NOW)).toHaveLength(1);
  });

  it("qonaq və hesablı oyunçu 10 saniyədən sonra birləşir", () => {
    const guest = entry("g", 1000, 0, { guest: true });
    expect(compatible(entry("u", 1000), guest, NOW)).toBe(false);
    expect(compatible(entry("u", 1000, 11_000), guest, NOW)).toBe(true);
  });

  it("bayaqkı rəqiblə dərhal yenə düşmür", () => {
    expect(compatible(entry("a", 1000, 0, { avoid: "b" }), entry("b", 1000), NOW)).toBe(false);
    expect(compatible(entry("a", 1000, 25_000, { avoid: "b" }), entry("b", 1000, 25_000), NOW)).toBe(true);
  });

  it("öz-özünə düşmür", () => {
    expect(findPairs([entry("a", 1000), entry("a", 1000)], NOW)).toHaveLength(0);
  });
});
