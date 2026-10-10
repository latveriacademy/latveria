CREATE TABLE IF NOT EXISTS "warrior_battles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"mode" text DEFAULT '1v1' NOT NULL,
	"status" text DEFAULT 'waiting' NOT NULL,
	"question_count" integer DEFAULT 5 NOT NULL,
	"time_per_question_seconds" integer DEFAULT 20 NOT NULL,
	"current_question_index" integer DEFAULT 0 NOT NULL,
	"question_started_at" timestamp with time zone,
	"question_deadline_at" timestamp with time zone,
	"topic_id" uuid,
	"winner_team_number" integer,
	"started_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "warrior_battles_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "warrior_battles" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "warrior_battle_teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"battle_id" uuid NOT NULL,
	"team_number" integer NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "warrior_battle_teams_battle_num_unique" UNIQUE("battle_id","team_number")
);
--> statement-breakpoint
ALTER TABLE "warrior_battle_teams" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "warrior_battle_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"battle_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"is_ready" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'joined' NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"connected_at" timestamp with time zone,
	"disconnected_at" timestamp with time zone,
	CONSTRAINT "warrior_battle_participants_unique" UNIQUE("battle_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "warrior_battle_participants" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "warrior_battle_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"battle_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "warrior_battle_questions_battle_pos_unique" UNIQUE("battle_id","position")
);
--> statement-breakpoint
ALTER TABLE "warrior_battle_questions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "warrior_battle_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"battle_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"participant_id" uuid NOT NULL,
	"response_payload" jsonb,
	"selected_answer" integer,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"elapsed_ms" integer DEFAULT 0 NOT NULL,
	"is_correct" boolean DEFAULT false NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "warrior_battle_answers_unique" UNIQUE("battle_id","question_id","participant_id")
);
--> statement-breakpoint
ALTER TABLE "warrior_battle_answers" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'warrior_battles_topic_id_topics_id_fk'
  ) THEN
    ALTER TABLE "warrior_battles" ADD CONSTRAINT "warrior_battles_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE set null ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'warrior_battles_created_by_user_id_fk'
  ) THEN
    ALTER TABLE "warrior_battles" ADD CONSTRAINT "warrior_battles_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'warrior_battle_teams_battle_id_warrior_battles_id_fk'
  ) THEN
    ALTER TABLE "warrior_battle_teams" ADD CONSTRAINT "warrior_battle_teams_battle_id_warrior_battles_id_fk" FOREIGN KEY ("battle_id") REFERENCES "public"."warrior_battles"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'warrior_battle_participants_battle_id_warrior_battles_id_fk'
  ) THEN
    ALTER TABLE "warrior_battle_participants" ADD CONSTRAINT "warrior_battle_participants_battle_id_warrior_battles_id_fk" FOREIGN KEY ("battle_id") REFERENCES "public"."warrior_battles"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'warrior_battle_participants_team_id_warrior_battle_teams_id_fk'
  ) THEN
    ALTER TABLE "warrior_battle_participants" ADD CONSTRAINT "warrior_battle_participants_team_id_warrior_battle_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."warrior_battle_teams"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'warrior_battle_participants_user_id_user_id_fk'
  ) THEN
    ALTER TABLE "warrior_battle_participants" ADD CONSTRAINT "warrior_battle_participants_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'warrior_battle_questions_battle_id_warrior_battles_id_fk'
  ) THEN
    ALTER TABLE "warrior_battle_questions" ADD CONSTRAINT "warrior_battle_questions_battle_id_warrior_battles_id_fk" FOREIGN KEY ("battle_id") REFERENCES "public"."warrior_battles"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'warrior_battle_questions_question_id_questions_id_fk'
  ) THEN
    ALTER TABLE "warrior_battle_questions" ADD CONSTRAINT "warrior_battle_questions_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'warrior_battle_answers_battle_id_warrior_battles_id_fk'
  ) THEN
    ALTER TABLE "warrior_battle_answers" ADD CONSTRAINT "warrior_battle_answers_battle_id_warrior_battles_id_fk" FOREIGN KEY ("battle_id") REFERENCES "public"."warrior_battles"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'warrior_battle_answers_question_id_questions_id_fk'
  ) THEN
    ALTER TABLE "warrior_battle_answers" ADD CONSTRAINT "warrior_battle_answers_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'warrior_battle_answers_participant_id_warrior_battle_participants_id_fk'
  ) THEN
    ALTER TABLE "warrior_battle_answers" ADD CONSTRAINT "warrior_battle_answers_participant_id_warrior_battle_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."warrior_battle_participants"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "warrior_battles_code_idx" ON "warrior_battles" USING btree ("code");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "warrior_battles_status_idx" ON "warrior_battles" USING btree ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "warrior_battles_created_by_idx" ON "warrior_battles" USING btree ("created_by");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "warrior_battle_teams_battle_idx" ON "warrior_battle_teams" USING btree ("battle_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "warrior_battle_participants_battle_idx" ON "warrior_battle_participants" USING btree ("battle_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "warrior_battle_participants_user_idx" ON "warrior_battle_participants" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "warrior_battle_questions_battle_idx" ON "warrior_battle_questions" USING btree ("battle_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "warrior_battle_answers_battle_idx" ON "warrior_battle_answers" USING btree ("battle_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "warrior_battle_answers_participant_idx" ON "warrior_battle_answers" USING btree ("participant_id");
