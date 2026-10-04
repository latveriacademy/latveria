CREATE TABLE "learner_vocabulary" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"question_id" uuid,
	"annotation_id" uuid NOT NULL,
	"annotation" jsonb NOT NULL,
	"source" text NOT NULL,
	"saved_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vocabulary_user_question_annotation_unique" UNIQUE("user_id","question_id","annotation_id")
);
--> statement-breakpoint
ALTER TABLE "learner_vocabulary" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "annotations" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "learner_vocabulary" ADD CONSTRAINT "learner_vocabulary_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learner_vocabulary" ADD CONSTRAINT "learner_vocabulary_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE set null ON UPDATE no action;