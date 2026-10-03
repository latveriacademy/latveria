ALTER TABLE "practice_answers" DROP CONSTRAINT "practice_answers_question_id_questions_id_fk";
--> statement-breakpoint
ALTER TABLE "practice_answers" ADD CONSTRAINT "practice_answers_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;