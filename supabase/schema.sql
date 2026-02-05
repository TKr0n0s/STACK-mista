-- ========================
-- Queima Intermitente - Database Schema
-- ========================

-- Purchase Activations (server-only, RLS DENY-ALL)
CREATE TABLE purchase_activations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  transaction_id TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','otp_sent','activated','failed')),
  otp_hash TEXT,
  otp_expires_at TIMESTAMPTZ,
  otp_attempts INT DEFAULT 0 CHECK (otp_attempts <= 5),
  webhook_payload JSONB,
  activated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_activations_email ON purchase_activations(email);
CREATE INDEX idx_activations_tx ON purchase_activations(transaction_id);

ALTER TABLE purchase_activations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_all_public_access" ON purchase_activations
  FOR ALL TO anon, authenticated USING (false);

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  age INT CHECK (age > 0 AND age < 120),
  weight DECIMAL CHECK (weight > 0 AND weight < 500),
  target_weight DECIMAL CHECK (target_weight > 0 AND target_weight < 500),
  activity_level TEXT CHECK (activity_level IN ('sedentary','light','moderate','active')),
  dietary_restrictions TEXT[],
  foods_to_avoid TEXT,
  protein_preference TEXT CHECK (protein_preference IN ('chicken','fish','meat','eggs','legumes')),
  fasting_start_hour INT DEFAULT 20 CHECK (fasting_start_hour >= 0 AND fasting_start_hour < 24),
  fasting_end_hour INT DEFAULT 12 CHECK (fasting_end_hour >= 0 AND fasting_end_hour < 24),
  current_week INT DEFAULT 1,
  profile_completed BOOLEAN DEFAULT FALSE,
  purchase_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_data" ON users FOR ALL USING (auth.uid() = id);

-- AI Plans
CREATE TABLE ai_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  plan_content TEXT NOT NULL,
  regenerations_today INT DEFAULT 0,
  last_regenerated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_ai_plans_user ON ai_plans(user_id);

ALTER TABLE ai_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_data" ON ai_plans FOR ALL USING (auth.uid() = user_id);

-- Days
CREATE TABLE days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  week_number INT NOT NULL CHECK (week_number > 0),
  day_number INT NOT NULL CHECK (day_number >= 1 AND day_number <= 7),
  source TEXT NOT NULL CHECK (source IN ('static', 'generated')),
  title TEXT,
  breakfast_name TEXT, breakfast_desc TEXT, breakfast_image TEXT,
  lunch_name TEXT, lunch_desc TEXT, lunch_image TEXT,
  dinner_name TEXT, dinner_desc TEXT, dinner_image TEXT,
  water_target TEXT DEFAULT '2L', tea_name TEXT, tea_tip TEXT,
  exercise_name TEXT, exercise_desc TEXT,
  tip_of_day TEXT, did_you_know TEXT, motivation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week_number, day_number)
);
CREATE INDEX idx_days_user_week ON days(user_id, week_number, day_number);

ALTER TABLE days ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_data" ON days FOR ALL USING (auth.uid() = user_id);

-- Daily Progress
CREATE TABLE daily_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  day_id UUID REFERENCES days(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  week INT NOT NULL,
  day_number INT NOT NULL,
  water_cups INT DEFAULT 0 CHECK (water_cups >= 0 AND water_cups <= 15),
  fasting_started_at TIMESTAMPTZ,
  fasting_ended_at TIMESTAMPTZ,
  breakfast_done BOOLEAN DEFAULT FALSE,
  lunch_done BOOLEAN DEFAULT FALSE,
  dinner_done BOOLEAN DEFAULT FALSE,
  exercise_done BOOLEAN DEFAULT FALSE,
  completed BOOLEAN DEFAULT FALSE,
  UNIQUE(user_id, date)
);
CREATE INDEX idx_progress_user_date ON daily_progress(user_id, date);
CREATE INDEX idx_progress_user_week ON daily_progress(user_id, week, completed);

ALTER TABLE daily_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_data" ON daily_progress FOR ALL USING (auth.uid() = user_id);

-- Weekly Reflections
CREATE TABLE weekly_reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  week_number INT NOT NULL,
  energy TEXT CHECK (energy IN ('great','good','ok','low','bad')),
  sleep TEXT CHECK (sleep IN ('great','good','ok','bad','terrible')),
  mood TEXT CHECK (mood IN ('great','good','ok','tired','bad')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week_number)
);

ALTER TABLE weekly_reflections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_data" ON weekly_reflections FOR ALL USING (auth.uid() = user_id);

-- User Consents (LGPD)
CREATE TABLE user_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL CHECK (consent_type IN ('privacy_policy','health_data','marketing')),
  granted BOOLEAN NOT NULL,
  ip_address INET,
  user_agent TEXT,
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

ALTER TABLE user_consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_data" ON user_consents FOR ALL USING (auth.uid() = user_id);

-- ========================
-- FUNCTIONS
-- ========================

CREATE FUNCTION can_access_week(p_user_id UUID, p_week INT)
RETURNS BOOLEAN AS $$
BEGIN
  IF p_week = 1 THEN RETURN TRUE; END IF;
  RETURN (
    SELECT COUNT(*) >= 5
    FROM public.daily_progress
    WHERE user_id = p_user_id AND week = p_week - 1 AND completed = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp;
