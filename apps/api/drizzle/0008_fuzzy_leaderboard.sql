-- Leaderboard support: track first attempts per user per question, demo user flag
--> statement-breakpoint
ALTER TABLE "practice_answers" ADD COLUMN "is_first_attempt" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE "practice_answers" ADD CONSTRAINT "practice_answers_is_first_attempt_check" CHECK ("is_first_attempt" IN (true, false));
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "is_demo" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_is_demo_check" CHECK ("is_demo" IN (true, false));
--> statement-breakpoint
ALTER TABLE "practice_answers" ADD COLUMN "submitted_at" timestamp with time zone DEFAULT now() NOT NULL;
--> statement-breakpoint
UPDATE "practice_answers" a SET "submitted_at" = p."submitted_at" FROM "practice_attempts" p WHERE a."attempt_id" = p."id";
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "practice_attempts_submitted_at_idx" ON "practice_attempts" ("submitted_at");
--> statement-breakpoint
-- Backfill: mark all existing answers as first attempts
UPDATE "practice_answers" SET "is_first_attempt" = true;
