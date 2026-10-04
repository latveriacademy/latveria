-- Add hide_from_leaderboard column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user' AND column_name = 'hide_from_leaderboard'
  ) THEN
    ALTER TABLE "user" ADD COLUMN "hide_from_leaderboard" boolean DEFAULT false NOT NULL;
  END IF;
END $$;