-- Migration: meal_images cache table for Pexels food images
-- Used by /api/enrich-images to avoid redundant API calls.
-- RLS: SELECT open for all, INSERT/UPDATE/DELETE restricted to service_role only.

CREATE TABLE IF NOT EXISTS meal_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_name_normalized TEXT NOT NULL UNIQUE,
  image_url TEXT NOT NULL,
  source TEXT DEFAULT 'pexels',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meal_images_name ON meal_images(meal_name_normalized);

ALTER TABLE meal_images ENABLE ROW LEVEL SECURITY;

-- Anyone can read the cache (shared resource)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'meal_images_read_all' AND tablename = 'meal_images'
  ) THEN
    CREATE POLICY "meal_images_read_all" ON meal_images FOR SELECT USING (true);
  END IF;
END $$;

-- No INSERT/UPDATE/DELETE policies = blocked for anon/authenticated.
-- Only service_role (admin client) can write — bypasses RLS automatically.
