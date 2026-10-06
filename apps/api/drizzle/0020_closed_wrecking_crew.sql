DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'questions' AND column_name = 'passage_id'
  ) THEN
    ALTER TABLE "questions" ADD COLUMN "passage_id" uuid;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'questions_passage_id_questions_id_fk'
  ) THEN
    ALTER TABLE "questions" ADD CONSTRAINT "questions_passage_id_questions_id_fk" FOREIGN KEY ("passage_id") REFERENCES "public"."questions"("id") ON DELETE set null ON UPDATE no action;
  END IF;
END $$;
