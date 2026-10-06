-- User management enhanced fields
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "is_deactivated" boolean DEFAULT false NOT NULL;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "deactivated_at" timestamp;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "account_notes" text DEFAULT '' NOT NULL;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "last_login_at" timestamp;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "failed_login_attempts" integer DEFAULT 0 NOT NULL;
