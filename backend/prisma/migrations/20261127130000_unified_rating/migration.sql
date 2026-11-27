-- Vahid reytinq: hər oyun 1000-dən başlayır, ümumi reytinq = 1000 + bütün oyunlardakı dəyişikliklərin cəmi
CREATE TABLE "rating_events" (
    "id" BIGSERIAL NOT NULL,
    "user_id" UUID NOT NULL,
    "game_id" TEXT NOT NULL,
    "delta" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL,
    "session_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rating_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "rating_events_created_at_idx" ON "rating_events"("created_at");
CREATE INDEX "rating_events_user_id_created_at_idx" ON "rating_events"("user_id", "created_at");
CREATE INDEX "rating_events_game_id_created_at_idx" ON "rating_events"("game_id", "created_at");
CREATE INDEX "rating_events_session_id_idx" ON "rating_events"("session_id");

ALTER TABLE "rating_events" ADD CONSTRAINT "rating_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Solo oynamış hər kəsə həmin oyunlar üçün 1000-lik reytinq sətri (oyun sayı saxlanılır)
INSERT INTO "user_ratings" ("id", "user_id", "game_id", "rating", "peak", "games", "created_at", "updated_at")
SELECT gen_random_uuid(), s."user_id", s."game_id", 1000, 1000, s."played", NOW(), NOW()
FROM "user_game_stats" s
WHERE s."user_id" IS NOT NULL AND s."played" > 0
ON CONFLICT ("user_id", "game_id") DO NOTHING;

-- Ümumi sətir hər kəs üçün mövcud olsun
INSERT INTO "user_ratings" ("id", "user_id", "game_id", "rating", "peak", "games", "created_at", "updated_at")
SELECT gen_random_uuid(), r."user_id", 'overall', 1000, 1000, 0, NOW(), NOW()
FROM "user_ratings" r
WHERE r."game_id" <> 'overall'
GROUP BY r."user_id"
ON CONFLICT ("user_id", "game_id") DO NOTHING;

-- Ümumi reytinq = 1000 + Σ(oyun reytinqi − 1000); oyun sayı = bütün oyunların cəmi
UPDATE "user_ratings" o
SET "rating" = GREATEST(100, 1000 + t."gain"),
    "peak" = GREATEST(1000, 1000 + t."gain"),
    "games" = t."games",
    "wins" = t."wins",
    "losses" = t."losses",
    "draws" = t."draws",
    "updated_at" = NOW()
FROM (
  SELECT "user_id",
         SUM("rating" - 1000) AS "gain",
         SUM("games") AS "games",
         SUM("wins") AS "wins",
         SUM("losses") AS "losses",
         SUM("draws") AS "draws"
  FROM "user_ratings"
  WHERE "game_id" <> 'overall'
  GROUP BY "user_id"
) t
WHERE o."user_id" = t."user_id" AND o."game_id" = 'overall';
