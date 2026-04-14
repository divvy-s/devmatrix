ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "token_family_id" uuid;
UPDATE "sessions" SET "token_family_id" = "id" WHERE "token_family_id" IS NULL;
ALTER TABLE "sessions" ALTER COLUMN "token_family_id" SET NOT NULL;

ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "header_url" text;

CREATE INDEX IF NOT EXISTS "sessions_token_family_idx" ON "sessions" ("token_family_id");
