import { describe, expect, it } from "vitest";
import { getGameData } from "../src/lib/data.js";
import { CHEM, teamStrength } from "../src/modules/duel/games/auction.js";

const team = (ids: number[]) => ({
  money: 0,
  slots: ids.map((playerId) => ({ pos: "ANY", pick: { playerId, rating: 80, price: 1 } })),
});

describe("auction chemistry", () => {
  const data = getGameData();
  const id = (slug: string) => data.players.find((p) => p.slug === slug)!.id;

  it("same club + same country, same league, nothing", () => {
    // Yamal + Pedri: Barcelona (+3) and Spain (+3). Mbappé: La Liga with both (+1 each).
    const result = teamStrength(data, team([id("lamine-yamal"), id("pedri"), id("kylian-mbappe")]));
    expect(result.chem).toBe(CHEM.club + CHEM.country + 2 * CHEM.league);
    expect(result.total).toBe(240 + result.chem);
    // Haaland: Man City, Norway — no link with Yamal.
    expect(teamStrength(data, team([id("lamine-yamal"), id("erling-haaland")])).chem).toBe(0);
  });

  it("caps chemistry", () => {
    const spanishBarca = data.players
      .filter((p) => p.current_club_id === data.players.find((x) => x.slug === "pedri")!.current_club_id && p.nationality_code === "ES")
      .slice(0, 5)
      .map((p) => p.id);
    expect(teamStrength(data, team(spanishBarca)).chem).toBe(CHEM.cap);
  });
});
