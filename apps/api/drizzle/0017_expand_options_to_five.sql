-- Change questions options from 4 to 5
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'questions_four_options') THEN
    ALTER TABLE questions DROP CONSTRAINT questions_four_options;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'questions_five_options') THEN
    ALTER TABLE questions DROP CONSTRAINT questions_five_options;
  END IF;
END $$;

-- First update any existing questions with only 4 options to have 5 (placeholder)
UPDATE questions SET options = array_append(options, '(Pilihan baru)') WHERE cardinality(options) = 4;

ALTER TABLE questions ADD CONSTRAINT questions_five_options CHECK (array_ndims(options) = 1 AND cardinality(options) = 5 AND array_position(options, null) IS NULL);

-- Update answer_valid_selected to accept 0-4
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'answer_valid_selected') THEN
    ALTER TABLE practice_answers DROP CONSTRAINT answer_valid_selected;
  END IF;
END $$;

ALTER TABLE practice_answers ADD CONSTRAINT answer_valid_selected CHECK (selected_answer BETWEEN 0 AND 4);
