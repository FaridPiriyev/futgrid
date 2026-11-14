-- AlterTable
ALTER TABLE "users" ADD COLUMN     "admin_totp_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "admin_totp_secret" TEXT;

-- CreateTable
CREATE TABLE "players" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "nationality_code" TEXT,
    "position" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "birth_date" TEXT,
    "height_cm" INTEGER,
    "preferred_foot" TEXT,
    "current_club_id" INTEGER,
    "current_club_name" TEXT,
    "market_value_eur" DOUBLE PRECISION,
    "highest_value_eur" DOUBLE PRECISION,
    "photo_url" TEXT,
    "data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clubs" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "short_name" TEXT,
    "logo_url" TEXT,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clubs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_stints" (
    "id" BIGSERIAL NOT NULL,
    "player_id" INTEGER NOT NULL,
    "club_id" INTEGER NOT NULL,
    "from_date" TEXT,
    "to_date" TEXT,

    CONSTRAINT "player_stints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_trophies" (
    "id" BIGSERIAL NOT NULL,
    "player_id" INTEGER NOT NULL,
    "trophy_id" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "player_trophies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coaches" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "photo_url" TEXT,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coaches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "countries" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_en" TEXT,
    "flag_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "countries_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "famous_matches" (
    "id" TEXT NOT NULL,
    "competition" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "venue" TEXT,
    "home" JSONB NOT NULL,
    "away" JSONB NOT NULL,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "famous_matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_overrides" (
    "id" UUID NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "data_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_releases" (
    "id" UUID NOT NULL,
    "version" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'building',
    "report" JSONB,
    "manifest" JSONB,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_at" TIMESTAMP(3),

    CONSTRAINT "data_releases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media" (
    "id" UUID NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "source_url" TEXT NOT NULL,
    "license" TEXT,
    "author" TEXT,
    "hash" TEXT,
    "urls" JSONB,
    "status" TEXT NOT NULL DEFAULT 'ready',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" BIGSERIAL NOT NULL,
    "admin_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" TEXT,
    "before" JSONB,
    "after" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "players_slug_key" ON "players"("slug");

-- CreateIndex
CREATE INDEX "players_nationality_code_idx" ON "players"("nationality_code");

-- CreateIndex
CREATE INDEX "players_position_is_active_idx" ON "players"("position", "is_active");

-- CreateIndex
CREATE INDEX "players_market_value_eur_idx" ON "players"("market_value_eur");

-- CreateIndex
CREATE UNIQUE INDEX "clubs_slug_key" ON "clubs"("slug");

-- CreateIndex
CREATE INDEX "player_stints_player_id_idx" ON "player_stints"("player_id");

-- CreateIndex
CREATE INDEX "player_stints_club_id_idx" ON "player_stints"("club_id");

-- CreateIndex
CREATE INDEX "player_trophies_trophy_id_idx" ON "player_trophies"("trophy_id");

-- CreateIndex
CREATE UNIQUE INDEX "player_trophies_player_id_trophy_id_key" ON "player_trophies"("player_id", "trophy_id");

-- CreateIndex
CREATE UNIQUE INDEX "coaches_slug_key" ON "coaches"("slug");

-- CreateIndex
CREATE INDEX "data_overrides_entity_type_entity_id_idx" ON "data_overrides"("entity_type", "entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "data_overrides_entity_type_entity_id_field_key" ON "data_overrides"("entity_type", "entity_id", "field");

-- CreateIndex
CREATE UNIQUE INDEX "data_releases_version_key" ON "data_releases"("version");

-- CreateIndex
CREATE INDEX "data_releases_status_created_at_idx" ON "data_releases"("status", "created_at");

-- CreateIndex
CREATE INDEX "media_entity_type_entity_id_idx" ON "media"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "media_hash_idx" ON "media"("hash");

-- CreateIndex
CREATE INDEX "audit_log_admin_id_created_at_idx" ON "audit_log"("admin_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_log_entity_entity_id_idx" ON "audit_log"("entity", "entity_id");

-- CreateIndex
CREATE INDEX "points_ledger_session_id_idx" ON "points_ledger"("session_id");

-- AddForeignKey
ALTER TABLE "player_stints" ADD CONSTRAINT "player_stints_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_stints" ADD CONSTRAINT "player_stints_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_trophies" ADD CONSTRAINT "player_trophies_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
