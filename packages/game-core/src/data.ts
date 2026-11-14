import type { GameData, RawGameData } from "./types.js";

export function norm(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/ø/g, "o")
    .replace(/ə/g, "e")
    .replace(/ı/g, "i")
    .replace(/æ/g, "ae")
    .replace(/ß/g, "ss")
    .replace(/đ/g, "d")
    .replace(/ł/g, "l")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function createGameData(raw: RawGameData): GameData {
  const clubs = raw.clubs ?? [];
  const players = raw.players ?? [];
  const trophies = raw.trophies ?? [];
  const countries = raw.countries ?? [];
  const coaches = raw.coaches ?? [];
  const famousMatches = raw.famousMatches ?? [];

  const clubsById = new Map(clubs.map((club) => [club.id, club]));
  const playersById = new Map<number, (typeof players)[number]>();
  const playersByClub = new Map<number, Set<number>>();

  for (const player of players) {
    playersById.set(player.id, player);
    for (const clubId of new Set(player.club_history ?? [])) {
      if (!playersByClub.has(clubId)) playersByClub.set(clubId, new Set());
      playersByClub.get(clubId)?.add(player.id);
    }
  }

  return {
    clubs,
    players,
    trophies,
    countries,
    coaches,
    famousMatches,
    clubsById,
    playersById,
    playersByClub,
    trophiesById: new Map(trophies.map((trophy) => [trophy.id, trophy])),
    countriesByCode: new Map(countries.map((country) => [country.code, country])),
    coachesById: new Map(coaches.map((coach) => [coach.id, coach])),
  };
}

export const DATA_VERSION = "v1";
