ALTER TABLE "question_packages" ADD COLUMN "target_year" integer;--> statement-breakpoint
ALTER TABLE "tryout_sessions" ADD COLUMN "subtest_config" text DEFAULT '[]' NOT NULL;