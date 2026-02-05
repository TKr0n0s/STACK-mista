-- Fix: ai_plans needs UNIQUE(user_id) for upsert to work correctly
-- Without this, the Supabase JS upsert with onConflict: 'user_id' silently fails
-- The API code now uses explicit update/insert as a workaround, but this
-- constraint should still be added for data integrity.

-- First, clean up any duplicate rows (keep the most recent per user)
DELETE FROM ai_plans a
USING ai_plans b
WHERE a.user_id = b.user_id
  AND a.created_at < b.created_at;

-- Add unique constraint
ALTER TABLE ai_plans ADD CONSTRAINT ai_plans_user_id_key UNIQUE (user_id);
