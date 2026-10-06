-- 1. Create table tryout_sections
CREATE TABLE IF NOT EXISTS "tryout_sections" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "package_id" uuid NOT NULL REFERENCES "question_packages"("id") ON DELETE CASCADE,
  "subtest_code" text NOT NULL,
  "title" text NOT NULL,
  "section_order" integer DEFAULT 0 NOT NULL,
  "duration_seconds" integer DEFAULT 1800 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "tryout_sections_package_code_unique" UNIQUE("package_id", "subtest_code"),
  CONSTRAINT "tryout_sections_package_order_unique" UNIQUE("package_id", "section_order")
);
CREATE INDEX IF NOT EXISTS "tryout_sections_package_idx" ON "tryout_sections" ("package_id");
ALTER TABLE "tryout_sections" ENABLE ROW LEVEL SECURITY;

-- 2. Alter tryout_package_questions: add section_id and position
ALTER TABLE "tryout_package_questions" ADD COLUMN IF NOT EXISTS "section_id" uuid REFERENCES "tryout_sections"("id") ON DELETE CASCADE;
ALTER TABLE "tryout_package_questions" ADD COLUMN IF NOT EXISTS "position" integer DEFAULT 0 NOT NULL;
CREATE INDEX IF NOT EXISTS "tryout_package_questions_section_idx" ON "tryout_package_questions" ("section_id");

-- 3. Alter questions: add question_type, schema_version, stimulus, passage, statements, scoring_config
ALTER TABLE "questions" ADD COLUMN IF NOT EXISTS "question_type" text DEFAULT 'single_choice' NOT NULL;
ALTER TABLE "questions" ADD COLUMN IF NOT EXISTS "schema_version" integer DEFAULT 1 NOT NULL;
ALTER TABLE "questions" ADD COLUMN IF NOT EXISTS "stimulus" jsonb;
ALTER TABLE "questions" ADD COLUMN IF NOT EXISTS "passage" text;
ALTER TABLE "questions" ADD COLUMN IF NOT EXISTS "statements" jsonb;
ALTER TABLE "questions" ADD COLUMN IF NOT EXISTS "scoring_config" jsonb;

-- Relax constraint questions_five_options to allow other question types
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'questions_five_options') THEN
    ALTER TABLE "questions" DROP CONSTRAINT "questions_five_options";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'questions_valid_answer') THEN
    ALTER TABLE "questions" DROP CONSTRAINT "questions_valid_answer";
  END IF;
END $$;

ALTER TABLE "questions" ADD CONSTRAINT "questions_five_options" CHECK (
  question_type != 'single_choice' OR (array_ndims(options) = 1 AND cardinality(options) = 5 AND array_position(options, null) IS NULL)
);

ALTER TABLE "questions" ADD CONSTRAINT "questions_valid_answer" CHECK (
  question_type != 'single_choice' OR (correct_answer BETWEEN 0 AND 4)
);

-- 4. Alter practice_answers: add response_payload and relax answer_valid_selected
ALTER TABLE "practice_answers" ADD COLUMN IF NOT EXISTS "response_payload" jsonb;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'answer_valid_selected') THEN
    ALTER TABLE "practice_answers" DROP CONSTRAINT "answer_valid_selected";
  END IF;
END $$;

ALTER TABLE "practice_answers" ADD CONSTRAINT "answer_valid_selected" CHECK (
  selected_answer BETWEEN 0 AND 4 OR selected_answer = -1
);
