-- Migration: Add program_start_date column
-- Run this in Supabase SQL Editor before deploying the code

-- Step 1: Add column (NON-BREAKING - can run immediately)
ALTER TABLE users ADD COLUMN IF NOT EXISTS program_start_date TIMESTAMPTZ;

-- Step 2: Add documentation
COMMENT ON COLUMN users.program_start_date IS
  'When the user started the program (completed onboarding). Used for day calculation. NULL means not started yet.';

-- Step 3: Backfill existing users (run AFTER Step 1)
-- This sets program_start_date = created_at for users who already completed onboarding
UPDATE users
SET program_start_date = created_at
WHERE profile_completed = true AND program_start_date IS NULL;

-- Step 4: Verify backfill (should return missing = 0)
SELECT
  COUNT(*) as total_users,
  COUNT(program_start_date) as has_program_start_date,
  COUNT(CASE WHEN profile_completed = true AND program_start_date IS NULL THEN 1 END) as missing_program_start_date
FROM users;

-- Optional Step 5: Set NOT NULL constraint (run AFTER confirming all users have values)
-- Only run this after Step 4 shows missing = 0
-- ALTER TABLE users ALTER COLUMN program_start_date SET NOT NULL;
-- ALTER TABLE users ALTER COLUMN program_start_date SET DEFAULT NOW();
