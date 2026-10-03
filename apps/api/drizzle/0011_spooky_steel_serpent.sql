ALTER TABLE "tryout_sessions" ADD COLUMN "question_sets" text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "tryout_sessions" ADD COLUMN "question_times" text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "tryout_sessions" ADD COLUMN "score_breakdown" text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE "tryout_sessions" ADD COLUMN "subtest_started_at" timestamp with time zone DEFAULT now() NOT NULL;