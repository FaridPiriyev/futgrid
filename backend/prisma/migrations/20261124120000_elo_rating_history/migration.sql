-- Elo: heç-heçə sayı və ən yüksək reytinq
ALTER TABLE "user_ratings" ADD COLUMN "draws" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "peak" DOUBLE PRECISION NOT NULL DEFAULT 1000;
UPDATE "user_ratings" SET "peak" = GREATEST("rating", 1000);

-- Duel tarixçəsi: reytinq dəyişikliyi saxlanılır
ALTER TABLE "duel_matches" ADD COLUMN "rated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "rating_changes" JSONB;

-- "Mənim duellərim" sorğusu üçün (player_ids @> ARRAY[...])
CREATE INDEX "duel_matches_player_ids_idx" ON "duel_matches" USING GIN ("player_ids");
