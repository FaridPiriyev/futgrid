-- CreateTable
CREATE TABLE "daily_puzzles" (
    "id" UUID NOT NULL,
    "game" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "seed" BIGINT NOT NULL,
    "data_version" TEXT NOT NULL,
    "puzzle" JSONB NOT NULL,
    "closed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_puzzles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_attempts" (
    "id" UUID NOT NULL,
    "puzzle_id" UUID NOT NULL,
    "user_id" UUID,
    "guest_id" UUID,
    "status" TEXT NOT NULL DEFAULT 'active',
    "state" JSONB NOT NULL,
    "score" DOUBLE PRECISION,
    "solved" BOOLEAN NOT NULL DEFAULT false,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_answer_counts" (
    "id" BIGSERIAL NOT NULL,
    "puzzle_id" UUID NOT NULL,
    "cell" INTEGER NOT NULL,
    "player_id" INTEGER NOT NULL,
    "selected_count" INTEGER NOT NULL DEFAULT 0,
    "correct_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_answer_counts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_streaks" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "guest_id" UUID,
    "game" TEXT NOT NULL,
    "current_streak" INTEGER NOT NULL DEFAULT 0,
    "best_streak" INTEGER NOT NULL DEFAULT 0,
    "last_date" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_streaks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goat_votes" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "guest_id" UUID,
    "size" INTEGER NOT NULL,
    "champion" TEXT NOT NULL,
    "final" TEXT[],
    "semi" TEXT[],
    "picks" JSONB NOT NULL,
    "counted" BOOLEAN NOT NULL DEFAULT false,
    "vote_date" TEXT NOT NULL,
    "ip_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goat_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goat_player_stats" (
    "id" UUID NOT NULL,
    "size" INTEGER NOT NULL,
    "player_id" TEXT NOT NULL,
    "champion_count" INTEGER NOT NULL DEFAULT 0,
    "final_count" INTEGER NOT NULL DEFAULT 0,
    "semi_count" INTEGER NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "elo" DOUBLE PRECISION NOT NULL DEFAULT 1500,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goat_player_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goat_pair_stats" (
    "id" BIGSERIAL NOT NULL,
    "size" INTEGER NOT NULL,
    "winner_id" TEXT NOT NULL,
    "loser_id" TEXT NOT NULL,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goat_pair_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_messages" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'az',
    "ip_hash" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "daily_puzzles_game_date_idx" ON "daily_puzzles"("game", "date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_puzzles_game_date_difficulty_key" ON "daily_puzzles"("game", "date", "difficulty");

-- CreateIndex
CREATE INDEX "daily_attempts_user_id_created_at_idx" ON "daily_attempts"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "daily_attempts_guest_id_created_at_idx" ON "daily_attempts"("guest_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "daily_attempts_puzzle_id_user_id_key" ON "daily_attempts"("puzzle_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "daily_attempts_puzzle_id_guest_id_key" ON "daily_attempts"("puzzle_id", "guest_id");

-- CreateIndex
CREATE INDEX "daily_answer_counts_puzzle_id_cell_idx" ON "daily_answer_counts"("puzzle_id", "cell");

-- CreateIndex
CREATE UNIQUE INDEX "daily_answer_counts_puzzle_id_cell_player_id_key" ON "daily_answer_counts"("puzzle_id", "cell", "player_id");

-- CreateIndex
CREATE INDEX "daily_streaks_game_current_streak_idx" ON "daily_streaks"("game", "current_streak");

-- CreateIndex
CREATE UNIQUE INDEX "daily_streaks_user_id_game_key" ON "daily_streaks"("user_id", "game");

-- CreateIndex
CREATE UNIQUE INDEX "daily_streaks_guest_id_game_key" ON "daily_streaks"("guest_id", "game");

-- CreateIndex
CREATE INDEX "goat_votes_user_id_vote_date_idx" ON "goat_votes"("user_id", "vote_date");

-- CreateIndex
CREATE INDEX "goat_votes_guest_id_vote_date_idx" ON "goat_votes"("guest_id", "vote_date");

-- CreateIndex
CREATE INDEX "goat_votes_size_counted_vote_date_idx" ON "goat_votes"("size", "counted", "vote_date");

-- CreateIndex
CREATE INDEX "goat_votes_ip_hash_vote_date_idx" ON "goat_votes"("ip_hash", "vote_date");

-- CreateIndex
CREATE INDEX "goat_player_stats_size_champion_count_idx" ON "goat_player_stats"("size", "champion_count");

-- CreateIndex
CREATE INDEX "goat_player_stats_size_elo_idx" ON "goat_player_stats"("size", "elo");

-- CreateIndex
CREATE UNIQUE INDEX "goat_player_stats_size_player_id_key" ON "goat_player_stats"("size", "player_id");

-- CreateIndex
CREATE INDEX "goat_pair_stats_size_winner_id_idx" ON "goat_pair_stats"("size", "winner_id");

-- CreateIndex
CREATE UNIQUE INDEX "goat_pair_stats_size_winner_id_loser_id_key" ON "goat_pair_stats"("size", "winner_id", "loser_id");

-- CreateIndex
CREATE INDEX "contact_messages_status_created_at_idx" ON "contact_messages"("status", "created_at");

-- AddForeignKey
ALTER TABLE "daily_attempts" ADD CONSTRAINT "daily_attempts_puzzle_id_fkey" FOREIGN KEY ("puzzle_id") REFERENCES "daily_puzzles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_attempts" ADD CONSTRAINT "daily_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_answer_counts" ADD CONSTRAINT "daily_answer_counts_puzzle_id_fkey" FOREIGN KEY ("puzzle_id") REFERENCES "daily_puzzles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_streaks" ADD CONSTRAINT "daily_streaks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goat_votes" ADD CONSTRAINT "goat_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
