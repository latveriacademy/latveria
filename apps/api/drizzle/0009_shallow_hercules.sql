CREATE TABLE "affirmations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"affirmation" text NOT NULL,
	"author" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "affirmations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "question_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_id" uuid NOT NULL,
	"package_id" uuid,
	"user_id" text NOT NULL,
	"reason" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "question_reports" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "system_config" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"description" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "system_config" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "tryout_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"package_id" uuid NOT NULL,
	"current_subtest_index" integer DEFAULT 0 NOT NULL,
	"state" text DEFAULT 'active' NOT NULL,
	"break_ends_at" timestamp with time zone,
	"answers" text DEFAULT '{}' NOT NULL,
	"flags" text DEFAULT '{}' NOT NULL,
	"current_question_index" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"total_score" integer
);
--> statement-breakpoint
ALTER TABLE "tryout_sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "practice_answers" ADD COLUMN "time_spent_seconds" integer;--> statement-breakpoint
ALTER TABLE "practice_answers" ADD COLUMN "item_weight" integer;--> statement-breakpoint
ALTER TABLE "practice_answers" ADD COLUMN "time_factor" integer;--> statement-breakpoint
ALTER TABLE "practice_answers" ADD COLUMN "item_score" integer;--> statement-breakpoint
ALTER TABLE "practice_attempts" ADD COLUMN "score" integer;--> statement-breakpoint
ALTER TABLE "practice_attempts" ADD COLUMN "raw_score" integer;--> statement-breakpoint
ALTER TABLE "practice_attempts" ADD COLUMN "time_spent_seconds" integer;--> statement-breakpoint
ALTER TABLE "practice_attempts" ADD COLUMN "score_breakdown" text;--> statement-breakpoint
ALTER TABLE "question_packages" ADD COLUMN "package_type" text DEFAULT 'Tryout' NOT NULL;--> statement-breakpoint
ALTER TABLE "question_packages" ADD COLUMN "duration" integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE "question_packages" ADD COLUMN "category" text DEFAULT 'utbk' NOT NULL;--> statement-breakpoint
ALTER TABLE "question_packages" ADD COLUMN "is_full_tryout" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "question_packages" ADD COLUMN "target_questions" integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE "question_packages" ADD COLUMN "published" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "item_weight" integer DEFAULT 100 NOT NULL;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "calculator_allowed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "subtest_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "topics" ADD COLUMN "category" text DEFAULT 'utbk' NOT NULL;--> statement-breakpoint
ALTER TABLE "topics" ADD COLUMN "section" text DEFAULT 'tps' NOT NULL;--> statement-breakpoint
ALTER TABLE "topics" ADD COLUMN "order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "question_reports" ADD CONSTRAINT "question_reports_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_reports" ADD CONSTRAINT "question_reports_package_id_question_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."question_packages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_reports" ADD CONSTRAINT "question_reports_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tryout_sessions" ADD CONSTRAINT "tryout_sessions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tryout_sessions" ADD CONSTRAINT "tryout_sessions_package_id_question_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."question_packages"("id") ON DELETE cascade ON UPDATE no action;