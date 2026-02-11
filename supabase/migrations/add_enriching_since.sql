-- Migration: Lock column for concurrent enrichment prevention
-- Phase 8.1: Prevents race conditions on /api/enrich-images

ALTER TABLE ai_plans
  ADD COLUMN IF NOT EXISTS enriching_since TIMESTAMPTZ;

-- Atomic lock function — deterministic, no race condition via UPDATE...RETURNING
CREATE OR REPLACE FUNCTION try_acquire_enrich_lock(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
AS $$
  UPDATE ai_plans
  SET enriching_since = NOW()
  WHERE user_id = p_user_id
    AND (enriching_since IS NULL OR enriching_since < NOW() - INTERVAL '60 seconds')
  RETURNING TRUE;
$$;
