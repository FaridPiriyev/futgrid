import { describe, expect, it } from "vitest";
import { computeElo, kFactor, pairResults } from "../src/modules/duel/rating.js";

const player = (id: string, rating: number, games = 50) => ({ id, rating, games });
const win = (a: string, b: string) => ({ a, b, scoreA: 1 });

describe("Elo (şahmat sistemi)", () => {
  it("güclü rəqibi udmaq çox, zəif rəqibi udmaq az xal verir", () => {
    const upset = computeElo([player("a", 1000), player("b", 1400)], [win("a", "b")]);
    const easy = computeElo([player("a", 1000), player("b", 600)], [win("a", "b")]);
    expect(upset.get("a")).toBe(18);
    expect(upset.get("b")).toBe(-18);
    expect(easy.get("a")).toBe(2);
  });

  it("bərabər oyunçular arasında ±10, yeni oyunçularda ±20", () => {
    expect(computeElo([player("a", 1000), player("b", 1000)], [win("a", "b")]).get("a")).toBe(10);
    expect(computeElo([player("a", 1000, 0), player("b", 1000, 0)], [win("a", "b")]).get("a")).toBe(20);
  });

  it("heç-heçədə güclü oyunçu xal itirir", () => {
    const deltas = computeElo([player("a", 1200), player("b", 1000)], [{ a: "a", b: "b", scoreA: 0.5 }]);
    expect(deltas.get("a")).toBeLessThan(0);
    expect(deltas.get("b")).toBeGreaterThan(0);
  });

  it("qalib ən azı +1 alır", () => {
    expect(computeElo([player("a", 2000), player("b", 600)], [win("a", "b")]).get("a")).toBe(1);
  });

  it("K faktoru: yeni 40, normal 20, 1800+ 10", () => {
    expect(kFactor(1000, 5)).toBe(40);
    expect(kFactor(1000, 30)).toBe(20);
    expect(kFactor(1900, 30)).toBe(10);
  });

  it("4 nəfərlik auksionda komanda gücünə görə sıralanır", () => {
    const seats = ["s1", "s2", "s3", "s4"];
    const pairs = pairResults({
      players: seats.map((seat) => ({ seat, id: seat, guest: false })),
      winnerSeat: "s1",
      loserSeat: "s4",
      endedReason: "win",
      strength: { s1: { total: 90 }, s2: { total: 80 }, s3: { total: 80 }, s4: { total: 70 } },
    });
    const deltas = computeElo(seats.map((id) => player(id, 1000)), pairs);
    expect(deltas.get("s1")).toBeGreaterThan(0);
    expect(deltas.get("s2")).toBe(0);
    expect(deltas.get("s4")).toBeLessThan(0);
  });

  it("çox oyunçulu oyunda çıxan oyunçu hamıya uduzur", () => {
    const pairs = pairResults({
      players: ["s1", "s2", "s3"].map((seat) => ({ seat, id: seat, guest: false })),
      winnerSeat: null,
      loserSeat: "s2",
      endedReason: "left",
    });
    expect(pairs).toEqual([win("s1", "s2"), win("s3", "s2")]);
  });
});
