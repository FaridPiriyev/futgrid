-- CreateTable
CREATE TABLE "user_ratings" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "game_id" TEXT NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 1000,
    "games" INTEGER NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'web',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "push_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "duel_matches" (
    "id" UUID NOT NULL,
    "game_id" TEXT NOT NULL,
    "room_code" TEXT NOT NULL,
    "winner_id" UUID,
    "loser_id" UUID,
    "player_ids" TEXT[],
    "score" JSONB,
    "duration_ms" INTEGER,
    "ended_reason" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "duel_matches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_ratings_game_id_rating_idx" ON "user_ratings"("game_id", "rating");

-- CreateIndex
CREATE UNIQUE INDEX "user_ratings_user_id_game_id_key" ON "user_ratings"("user_id", "game_id");

-- CreateIndex
CREATE UNIQUE INDEX "push_tokens_token_key" ON "push_tokens"("token");

-- CreateIndex
CREATE INDEX "push_tokens_user_id_enabled_idx" ON "push_tokens"("user_id", "enabled");

-- CreateIndex
CREATE INDEX "duel_matches_game_id_created_at_idx" ON "duel_matches"("game_id", "created_at");

-- CreateIndex
CREATE INDEX "duel_matches_winner_id_idx" ON "duel_matches"("winner_id");

-- AddForeignKey
ALTER TABLE "user_ratings" ADD CONSTRAINT "user_ratings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_tokens" ADD CONSTRAINT "push_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
