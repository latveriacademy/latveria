-- Repair databases that skipped 0008 because its journal timestamp predates 0007.
-- IF NOT EXISTS also supports fresh installs where the corrected 0008 already ran.
ALTER TABLE "practice_answers" ADD COLUMN IF NOT EXISTS "is_first_attempt" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "practice_answers" ADD COLUMN IF NOT EXISTS "submitted_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "is_demo" boolean DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE "practice_answers" a SET "submitted_at" = p."submitted_at" FROM "practice_attempts" p WHERE a."attempt_id" = p."id" AND a."submitted_at" = to_timestamp(0);--> statement-breakpoint
WITH ranked AS (
  SELECT a."id", row_number() OVER (PARTITION BY p."user_id", a."question_id" ORDER BY p."submitted_at", p."id", a."id") AS position
  FROM "practice_answers" a JOIN "practice_attempts" p ON a."attempt_id" = p."id"
)
UPDATE "practice_answers" a SET "is_first_attempt" = (r.position = 1) FROM ranked r WHERE a."id" = r."id";--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "practice_answers_submitted_idx" ON "practice_answers" USING btree ("submitted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "practice_attempts_submitted_idx" ON "practice_attempts" USING btree ("submitted_at");
