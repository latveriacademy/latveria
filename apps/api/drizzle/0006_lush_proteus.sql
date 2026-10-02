CREATE TABLE "question_packages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"topic_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "question_packages_id_topic_unique" UNIQUE("id","topic_id"),
	CONSTRAINT "question_packages_topic_name_unique" UNIQUE("topic_id","name")
);
--> statement-breakpoint
ALTER TABLE "question_packages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "practice_attempts" ADD COLUMN "package_id" uuid;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "package_id" uuid;--> statement-breakpoint
ALTER TABLE "question_packages" ADD CONSTRAINT "question_packages_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_attempts" ADD CONSTRAINT "practice_attempts_package_id_question_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."question_packages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_attempts" ADD CONSTRAINT "practice_attempts_package_topic_fk" FOREIGN KEY ("package_id","topic_id") REFERENCES "public"."question_packages"("id","topic_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_package_id_question_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."question_packages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_package_topic_fk" FOREIGN KEY ("package_id","topic_id") REFERENCES "public"."question_packages"("id","topic_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
INSERT INTO "question_packages" ("topic_id", "name", "description", "order", "is_active")
SELECT "id", 'Paket 1', 'Paket latihan standar', 1, true
FROM "topics"
ON CONFLICT ("topic_id", "name") DO NOTHING;--> statement-breakpoint
UPDATE "questions" q
SET "package_id" = p."id"
FROM "question_packages" p
WHERE q."topic_id" = p."topic_id" AND p."name" = 'Paket 1' AND q."package_id" IS NULL;--> statement-breakpoint
UPDATE "practice_attempts" a
SET "package_id" = p."id"
FROM "question_packages" p
WHERE a."topic_id" = p."topic_id" AND p."name" = 'Paket 1' AND a."package_id" IS NULL;