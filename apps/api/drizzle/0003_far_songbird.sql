CREATE TABLE "practice_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attempt_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"selected_answer" integer NOT NULL,
	"is_correct" integer NOT NULL,
	CONSTRAINT "answer_attempt_question_unique" UNIQUE("attempt_id","question_id"),
	CONSTRAINT "answer_valid_selected" CHECK ("practice_answers"."selected_answer" between 0 and 3),
	CONSTRAINT "answer_valid_correct" CHECK ("practice_answers"."is_correct" in (0, 1))
);
--> statement-breakpoint
ALTER TABLE "practice_answers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "practice_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"topic_id" uuid NOT NULL,
	"correct_count" integer NOT NULL,
	"total_count" integer NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attempt_valid_score" CHECK ("practice_attempts"."correct_count" >= 0 and "practice_attempts"."correct_count" <= "practice_attempts"."total_count" and "practice_attempts"."total_count" > 0)
);
--> statement-breakpoint
ALTER TABLE "practice_attempts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "practice_answers" ADD CONSTRAINT "practice_answers_attempt_id_practice_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."practice_attempts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_answers" ADD CONSTRAINT "practice_answers_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_attempts" ADD CONSTRAINT "practice_attempts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_attempts" ADD CONSTRAINT "practice_attempts_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE no action ON UPDATE no action;
