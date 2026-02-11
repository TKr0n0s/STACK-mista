-- Migration: Add UNIQUE constraint on ai_plans.user_id
-- Required for: upsert in generate-plan API + prevent duplicate plans per user
-- Run this BEFORE deploying Phase 4 code

-- Step 1: Remove duplicates (keep most recent per user_id)
DELETE FROM ai_plans a
USING ai_plans b
WHERE a.user_id = b.user_id
  AND a.created_at < b.created_at;

-- Step 2: Add UNIQUE constraint
ALTER TABLE ai_plans
  ADD CONSTRAINT ai_plans_user_id_unique UNIQUE (user_id);
