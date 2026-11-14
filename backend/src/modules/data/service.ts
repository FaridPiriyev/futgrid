import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { config } from "../../config.js";
import { AppError } from "../../lib/errors.js";
import { readGameDataFile } from "../../lib/data.js";
import { logger } from "../../lib/logger.js";
import { prisma } from "../../lib/prisma.js";
import { publishObject } from "../../lib/storage.js";

interface RawPlayer {
  id: number;
  name: string;
  slug?: string;
  nationality_code?: string;
  position?: string;
  is_active?: boolean;
  birth_date?: string;
  height_cm?: number;
  preferred_foot?: string;
  current_club_id?: number;
  current_club_name?: string;
  club_history?: number[];
  club_stints?: { club_id: number; from?: string; to?: string }[];
  market_value?: { amount_eur?: number; highest_eur?: number };
  photo_url?: string;
  trophies?: { id: string; count?: number }[];
  [key: string]: unknown;
}

interface RawClub {
  id: number;
  name: string;
  slug?: string;
  short_name?: string;
  logo_url?: string;
  [key: string]: unknown;
}

interface RawCoach {
  id: string;
  name: string;
  slug?: string;
  photo_url?: string;
  [key: string]: unknown;
}

interface RawCountry {
  code: string;
  name?: string;
  name_en?: string;
  flag_url?: string;
  [key: string]: unknown;
}

interface RawMatch {
  id: string;
  competition: string;
  date: string;
  venue?: string;
  home: unknown;
  away: unknown;
  [key: string]: unknown;
}

interface RawData {
  players: RawPlayer[];
  clubs: RawClub[];
  trophies: unknown[];
  countries: RawCountry[];
  coaches: RawCoach[];
  famousMatches: RawMatch[];
}

export interface ValidationReport {
  version: string;
  createdAt: string;
  counts: Record<string, number>;
  errors: string[];
  warnings: string[];
}

function loadRawData(): RawData {
  return {
    players: readGameDataFile("players.json"),
    clubs: readGameDataFile("clubs.json"),
    trophies: readGameDataFile("trophies.json"),
    countries: readGameDataFile("countries.json"),
    coaches: readGameDataFile("coaches.json"),
    famousMatches: readGameDataFile("famous-matches.json"),
  };
}

function setPath(target: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split(".");
  let current = target;
  for (let index = 0; index < parts.length - 1; index++) {
    const key = parts[index] as string;
    if (typeof current[key] !== "object" || current[key] === null) current[key] = {};
    current = current[key] as Record<string, unknown>;
  }
  current[parts[parts.length - 1] as string] = value;
}

function collectionFor(data: RawData, entityType: string): Record<string, unknown>[] | null {
  switch (entityType) {
    case "player":
      return data.players as unknown as Record<string, unknown>[];
    case "club":
      return data.clubs as unknown as Record<string, unknown>[];
    case "coach":
      return data.coaches as unknown as Record<string, unknown>[];
    case "country":
      return data.countries as unknown as Record<string, unknown>[];
    case "famousMatch":
      return data.famousMatches as unknown as Record<string, unknown>[];
    default:
      return null;
  }
}

function idField(entityType: string): string {
  return entityType === "country" ? "code" : entityType === "coach" ? "id" : "id";
}

async function applyOverrides(data: RawData): Promise<number> {
  const overrides = await prisma.dataOverride.findMany();
  let applied = 0;
  for (const override of overrides) {
    const collection = collectionFor(data, override.entityType);
    if (!collection) continue;
    const field = idField(override.entityType);
    const entity = collection.find((item) => String(item[field]) === override.entityId);
    if (!entity) continue;
    setPath(entity, override.field, override.value);
    applied++;
  }
  return applied;
}

function validate(data: RawData): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const clubIds = new Set(data.clubs.map((club) => club.id));
  const playerIds = new Set<number>();
  for (const player of data.players) {
    if (!player.id || !player.name) errors.push(`player_invalid:${player.id}`);
    if (playerIds.has(player.id)) errors.push(`player_duplicate:${player.id}`);
    playerIds.add(player.id);
    if (player.current_club_id && !clubIds.has(player.current_club_id)) {
      warnings.push(`player_current_club_missing:${player.id}:${player.current_club_id}`);
    }
    for (const clubId of player.club_history ?? []) {
      if (!clubIds.has(clubId)) warnings.push(`player_history_club_missing:${player.id}:${clubId}`);
    }
  }
  for (const club of data.clubs) {
    if (!club.id || !club.name) errors.push(`club_invalid:${club.id}`);
  }
  return {
    errors: errors.slice(0, 200),
    warnings: warnings.slice(0, 200),
  };
}

export async function buildDataRelease(createdBy?: string) {
  const data = loadRawData();
  const appliedOverrides = await applyOverrides(data);
  const validation = validate(data);
  if (validation.errors.length) {
    throw new AppError("VALIDATION_FAILED", {
      details: validation.errors.map((error) => ({ rule: error })),
    });
  }

  const payload = JSON.stringify(data);
  const contentHash = createHash("sha256").update(payload).digest("hex").slice(0, 10);
  const version = `v${new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14)}-${contentHash}`;
  const createdAt = new Date().toISOString();
  const counts = {
    players: data.players.length,
    clubs: data.clubs.length,
    trophies: data.trophies.length,
    countries: data.countries.length,
    coaches: data.coaches.length,
    famousMatches: data.famousMatches.length,
  };
  const report: ValidationReport = {
    version,
    createdAt,
    counts,
    errors: validation.errors,
    warnings: validation.warnings,
  };
  const manifest = {
    version,
    dataVersion: version,
    createdAt,
    counts,
    files: [
      "players.json",
      "clubs.json",
      "trophies.json",
      "countries.json",
      "coaches.json",
      "famous-matches.json",
    ],
  };

  const release = await prisma.dataRelease.create({
    data: {
      version,
      status: "building",
      report: report as unknown as Prisma.InputJsonValue,
      manifest: manifest as unknown as Prisma.InputJsonValue,
      createdBy: createdBy ?? null,
    },
  });

  try {
    await publishObject("data", `${version}/players.json`, JSON.stringify(data.players), "application/json");
    await publishObject("data", `${version}/clubs.json`, JSON.stringify(data.clubs), "application/json");
    await publishObject("data", `${version}/trophies.json`, JSON.stringify(data.trophies), "application/json");
    await publishObject("data", `${version}/countries.json`, JSON.stringify(data.countries), "application/json");
    await publishObject("data", `${version}/coaches.json`, JSON.stringify(data.coaches), "application/json");
    await publishObject(
      "data",
      `${version}/famous-matches.json`,
      JSON.stringify(data.famousMatches),
      "application/json",
    );
    await publishObject("data", `${version}/manifest.json`, JSON.stringify(manifest), "application/json");
    await prisma.dataRelease.update({
      where: { id: release.id },
      data: { status: "built", report: { ...report, appliedOverrides } as unknown as Prisma.InputJsonValue },
    });
  } catch (error) {
    await prisma.dataRelease.update({
      where: { id: release.id },
      data: {
        status: "failed",
        report: { ...report, failures: [String(error)] } as unknown as Prisma.InputJsonValue,
      },
    });
    throw error;
  }

  return { ...release, version, report: { ...report, appliedOverrides } };
}

export async function publishDataRelease(id: string) {
  const release = await prisma.dataRelease.findUnique({ where: { id } });
  if (!release) throw new AppError("NOT_FOUND");
  if (release.status === "failed") throw new AppError("CONFLICT", { message: "Release failed" });
  const manifest = release.manifest as unknown as Record<string, unknown>;
  await publishObject(
    "data",
    "current.json",
    JSON.stringify({ ...manifest, publishedAt: new Date().toISOString() }),
    "application/json",
  );
  await prisma.$transaction([
    prisma.dataRelease.updateMany({
      where: { status: "published", id: { not: id } },
      data: { status: "superseded" },
    }),
    prisma.dataRelease.update({
      where: { id },
      data: { status: "published", publishedAt: new Date() },
    }),
  ]);
  return prisma.dataRelease.findUnique({ where: { id } });
}

export async function rollbackDataRelease(id: string) {
  return publishDataRelease(id);
}

async function chunkedCreate<T>(items: T[], create: (chunk: T[]) => Promise<unknown>, size = 2000) {
  for (let index = 0; index < items.length; index += size) {
    await create(items.slice(index, index + size));
  }
}

export async function syncDatabase(data?: RawData): Promise<void> {
  const source = data ?? loadRawData();
  await applyOverrides(source);
  await prisma.$transaction([
    prisma.playerTrophy.deleteMany(),
    prisma.playerStint.deleteMany(),
    prisma.playerRecord.deleteMany(),
    prisma.clubRecord.deleteMany(),
    prisma.coachRecord.deleteMany(),
    prisma.countryRecord.deleteMany(),
    prisma.famousMatchRecord.deleteMany(),
  ]);

  await chunkedCreate(source.clubs, (chunk) =>
    prisma.clubRecord.createMany({
      data: chunk.map((club) => ({
        id: club.id,
        name: club.name,
        slug: club.slug ?? null,
        shortName: club.short_name ?? null,
        logoUrl: club.logo_url ?? null,
      })),
    }),
  );
  await chunkedCreate(source.coaches, (chunk) =>
    prisma.coachRecord.createMany({
      data: chunk.map((coach) => ({
        id: coach.id,
        name: coach.name,
        slug: coach.slug ?? null,
        photoUrl: coach.photo_url ?? null,
      })),
    }),
  );
  await chunkedCreate(source.countries, (chunk) =>
    prisma.countryRecord.createMany({
      data: chunk.map((country) => ({
        code: country.code,
        name: country.name ?? country.code,
        nameEn: country.name_en ?? null,
        flagUrl: country.flag_url ?? null,
      })),
      skipDuplicates: true,
    }),
  );
  await chunkedCreate(source.famousMatches, (chunk) =>
    prisma.famousMatchRecord.createMany({
      data: chunk.map((match) => ({
        id: match.id,
        competition: match.competition,
        date: match.date,
        venue: match.venue ?? null,
        home: match.home as Prisma.InputJsonValue,
        away: match.away as Prisma.InputJsonValue,
      })),
      skipDuplicates: true,
    }),
  );
  await chunkedCreate(source.players, (chunk) =>
    prisma.playerRecord.createMany({
      data: chunk.map((player) => ({
        id: player.id,
        name: player.name,
        slug: player.slug ?? null,
        nationalityCode: player.nationality_code ?? null,
        position: player.position ?? null,
        isActive: player.is_active !== false,
        birthDate: player.birth_date ?? null,
        heightCm: player.height_cm ?? null,
        preferredFoot: player.preferred_foot ?? null,
        currentClubId: player.current_club_id ?? null,
        currentClubName: player.current_club_name ?? null,
        marketValueEur: player.market_value?.amount_eur ?? null,
        highestValueEur: player.market_value?.highest_eur ?? null,
        photoUrl: player.photo_url ?? null,
      })),
    }),
  );

  const stints = source.players.flatMap((player) =>
    (player.club_stints ?? []).map((stint) => ({
      playerId: player.id,
      clubId: stint.club_id,
      fromDate: stint.from ?? null,
      toDate: stint.to ?? null,
    })),
  );
  await chunkedCreate(stints, (chunk) => prisma.playerStint.createMany({ data: chunk }), 3000);

  const trophies = source.players.flatMap((player) =>
    (player.trophies ?? []).map((trophy) => ({
      playerId: player.id,
      trophyId: trophy.id,
      count: trophy.count ?? 1,
    })),
  );
  await chunkedCreate(trophies, (chunk) => prisma.playerTrophy.createMany({ data: chunk }), 3000);
}

export async function runDataSync(createdBy?: string) {
  const release = await buildDataRelease(createdBy);
  await syncDatabase();
  await publishDataRelease(release.id);
  logger.info({ version: release.version }, "data release synced and published");
  return release;
}

export async function applyMarketValuesCsv(csv: string, createdBy?: string) {
  const lines = csv.split(/\r?\n/).filter(Boolean);
  let applied = 0;
  for (const line of lines.slice(1)) {
    const [idRaw, valueRaw] = line.split(",");
    const playerId = Number(idRaw);
    const value = Number(valueRaw);
    if (!Number.isInteger(playerId) || !Number.isFinite(value) || value < 0) continue;
    await prisma.dataOverride.upsert({
      where: {
        entityType_entityId_field: {
          entityType: "player",
          entityId: String(playerId),
          field: "market_value.amount_eur",
        },
      },
      update: { value, createdBy: createdBy ?? null },
      create: {
        entityType: "player",
        entityId: String(playerId),
        field: "market_value.amount_eur",
        value,
        createdBy: createdBy ?? null,
      },
    });
    await prisma.playerRecord.updateMany({
      where: { id: playerId },
      data: { marketValueEur: value },
    });
    applied++;
  }
  return { applied };
}

export function dataPipelineConfig() {
  return {
    localSource: true,
    apiFootball: Boolean(config.API_FOOTBALL_KEY),
    transfermarktCsv: Boolean(config.TRANSFERMARKT_CSV_URL),
  };
}
