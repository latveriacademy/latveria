CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "passages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"content" text,
	"stimulus" jsonb,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"author_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "passages_author_id_fk" FOREIGN KEY ("author_id") REFERENCES "user"("id") ON DELETE SET NULL
);
--> statement-breakpoint
ALTER TABLE "passages" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "passages_title_idx" ON "passages" ("title");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "passages_created_idx" ON "passages" ("created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "passages_archived_idx" ON "passages" ("is_archived");
--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN IF NOT EXISTS "content_fingerprint" text;
--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN IF NOT EXISTS "workflow_status" text DEFAULT 'published' NOT NULL;
--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN IF NOT EXISTS "difficulty" text DEFAULT 'medium' NOT NULL;
--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN IF NOT EXISTS "tags" text[] DEFAULT '{}'::text[] NOT NULL;
--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN IF NOT EXISTS "source_question_id" uuid;
--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN IF NOT EXISTS "author_id" text;
--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN IF NOT EXISTS "reviewer_notes" text;
--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'questions_source_question_id_fk'
  ) THEN
    ALTER TABLE "questions" ADD CONSTRAINT "questions_source_question_id_fk"
      FOREIGN KEY ("source_question_id") REFERENCES "questions"("id") ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'questions_author_id_fk'
  ) THEN
    ALTER TABLE "questions" ADD CONSTRAINT "questions_author_id_fk"
      FOREIGN KEY ("author_id") REFERENCES "user"("id") ON DELETE SET NULL;
  END IF;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "questions_fingerprint_idx" ON "questions" ("content_fingerprint");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "questions_workflow_status_idx" ON "questions" ("workflow_status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "questions_difficulty_idx" ON "questions" ("difficulty");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "questions_source_idx" ON "questions" ("source_question_id");
--> statement-breakpoint
DO $$
BEGIN
  CREATE INDEX IF NOT EXISTS "questions_prompt_trgm_idx" ON "questions" USING gin ("prompt" gin_trgm_ops);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_trgm gin index skipped';
END $$;
--> statement-breakpoint
ALTER TABLE "question_revisions" ADD COLUMN IF NOT EXISTS "version_number" integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE "question_revisions" ADD COLUMN IF NOT EXISTS "author_id" text;
--> statement-breakpoint
ALTER TABLE "question_revisions" ADD COLUMN IF NOT EXISTS "change_summary" text;
--> statement-breakpoint
ALTER TABLE "question_revisions" ADD COLUMN IF NOT EXISTS "change_reason" text;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'question_revisions_author_id_fk'
  ) THEN
    ALTER TABLE "question_revisions" ADD CONSTRAINT "question_revisions_author_id_fk"
      FOREIGN KEY ("author_id") REFERENCES "user"("id") ON DELETE SET NULL;
  END IF;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "question_revisions_question_idx" ON "question_revisions" ("question_id", "created_at");
--> statement-breakpoint
UPDATE "questions" SET "content_fingerprint" = encode(sha256(prompt::bytea), 'hex') WHERE "content_fingerprint" IS NULL;
