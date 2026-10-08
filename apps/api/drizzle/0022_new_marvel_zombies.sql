CREATE TABLE "irt_calibrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"topic_id" uuid NOT NULL,
	"dataset_id" uuid NOT NULL,
	"version" text NOT NULL,
	"active" boolean DEFAULT false NOT NULL,
	"parameters" jsonb NOT NULL,
	"diagnostics" jsonb NOT NULL,
	"source_version" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "irt_calibration_topic_version_unique" UNIQUE("topic_id","version")
);
--> statement-breakpoint
ALTER TABLE "irt_calibrations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "irt_datasets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"topic_id" uuid NOT NULL,
	"dataset_hash" text NOT NULL,
	"sample_size" integer NOT NULL,
	"items" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "irt_datasets_dataset_hash_unique" UNIQUE("dataset_hash")
);
--> statement-breakpoint
ALTER TABLE "irt_datasets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "question_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_id" uuid NOT NULL,
	"topic_id" uuid NOT NULL,
	"content_hash" text NOT NULL,
	"snapshot" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "question_revision_hash_unique" UNIQUE("question_id","content_hash")
);
--> statement-breakpoint
ALTER TABLE "question_revisions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "tryout_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"revision_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"topic_id" uuid NOT NULL,
	"answer" jsonb,
	"is_answered" boolean NOT NULL,
	"score_fraction" double precision NOT NULL,
	"max_points" integer NOT NULL,
	"time_spent_seconds" integer NOT NULL,
	"irt_eligible" boolean NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tryout_response_session_question_unique" UNIQUE("session_id","question_id"),
	CONSTRAINT "tryout_response_valid_score" CHECK ("tryout_responses"."score_fraction" between 0 and 1 and "tryout_responses"."max_points" > 0 and "tryout_responses"."time_spent_seconds" >= 0)
);
--> statement-breakpoint
ALTER TABLE "tryout_responses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tryout_sessions" ADD COLUMN "scoring_version" text DEFAULT 'legacy' NOT NULL;--> statement-breakpoint
ALTER TABLE "tryout_sessions" ADD COLUMN "revision_sets" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "tryout_sessions" ADD COLUMN "scoring_plan" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "tryout_sessions" ADD COLUMN "score_report" jsonb;--> statement-breakpoint
ALTER TABLE "irt_calibrations" ADD CONSTRAINT "irt_calibrations_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "irt_calibrations" ADD CONSTRAINT "irt_calibrations_dataset_id_irt_datasets_id_fk" FOREIGN KEY ("dataset_id") REFERENCES "public"."irt_datasets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "irt_datasets" ADD CONSTRAINT "irt_datasets_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_revisions" ADD CONSTRAINT "question_revisions_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tryout_responses" ADD CONSTRAINT "tryout_responses_session_id_tryout_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."tryout_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tryout_responses" ADD CONSTRAINT "tryout_responses_revision_id_question_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."question_revisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tryout_responses" ADD CONSTRAINT "tryout_responses_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "irt_calibration_active_topic_unique" ON "irt_calibrations" USING btree ("topic_id") WHERE "irt_calibrations"."active" = true;--> statement-breakpoint
CREATE INDEX "tryout_response_topic_idx" ON "tryout_responses" USING btree ("topic_id");