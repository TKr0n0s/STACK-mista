-- Migration: Add photo ID for dedup + source for gradual cache invalidation
-- Phase 8.1: Smart image search with Gemini

ALTER TABLE meal_images
  ADD COLUMN IF NOT EXISTS pexels_photo_id INTEGER,
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'pexels';

CREATE INDEX IF NOT EXISTS idx_meal_images_photo_id
  ON meal_images(pexels_photo_id)
  WHERE pexels_photo_id IS NOT NULL;

-- Mark existing rows as legacy for gradual re-enrichment
UPDATE meal_images SET source = 'legacy' WHERE source IS NULL OR source = 'pexels';
