import { RANKED_GAME_KEYS, type GameKey } from "@futgrid/game-core";
import { prisma } from "./prisma.js";

export const GAME_NAMES: Record<GameKey, string> = {
  xox: "Futbol X0X",
  orta: "Ortaq Oyunçu",
  auction: "Açıq Artırma",
  higherLower: "Yüksək yoxsa Aşağı?",
  wordle: "Futbol Wordle",
  career: "Karyera yolu",
  lineups: "Heyəti xatırla",
  fiveClubs: "5 klub",
  clubOrder: "Klubları sırala",
  pyramid: "Piramida",
  twoLetters: "İki hərf",
};

export async function ensureGames(): Promise<void> {
  await Promise.all(
    RANKED_GAME_KEYS.map((key, index) =>
      prisma.game.upsert({
        where: { id: key },
        update: { name: GAME_NAMES[key], sortOrder: index },
        create: { id: key, name: GAME_NAMES[key], sortOrder: index },
      }),
    ),
  );
}
