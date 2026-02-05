// ========================
// Database types (mirror Supabase schema)
// ========================

export interface User {
  id: string
  email: string
  name: string
  age: number | null
  weight: number | null
  target_weight: number | null
  activity_level: 'sedentary' | 'light' | 'moderate' | 'active' | null
  dietary_restrictions: string[]
  foods_to_avoid: string | null
  protein_preference: 'chicken' | 'fish' | 'meat' | 'eggs' | 'legumes' | null
  fasting_start_hour: number
  fasting_end_hour: number
  current_week: number
  profile_completed: boolean
  purchase_id: string | null
  created_at: string
}

export interface AIPlan {
  id: string
  user_id: string
  plan_content: string
  regenerations_today: number
  last_regenerated_at: string | null
  created_at: string
}

export interface Meal {
  name: string
  desc: string
  image: string
  kcal?: number
}

export interface Day {
  id: string
  user_id: string
  week_number: number
  day_number: number
  source: 'static' | 'generated'
  title: string
  breakfast_name: string
  breakfast_desc: string
  breakfast_image: string
  lunch_name: string
  lunch_desc: string
  lunch_image: string
  dinner_name: string
  dinner_desc: string
  dinner_image: string
  water_target: string
  tea_name: string | null
  tea_tip: string | null
  exercise_name: string | null
  exercise_desc: string | null
  tip_of_day: string | null
  did_you_know: string | null
  motivation: string | null
  created_at: string
}

export interface DailyProgress {
  id: string
  user_id: string
  day_id: string
  date: string
  week: number
  day_number: number
  water_cups: number
  fasting_started_at: string | null
  fasting_ended_at: string | null
  breakfast_done: boolean
  lunch_done: boolean
  dinner_done: boolean
  exercise_done: boolean
  completed: boolean
}

export interface WeeklyReflection {
  id: string
  user_id: string
  week_number: number
  energy: 'great' | 'good' | 'ok' | 'low' | 'bad'
  sleep: 'great' | 'good' | 'ok' | 'bad' | 'terrible'
  mood: 'great' | 'good' | 'ok' | 'tired' | 'bad'
  created_at: string
}

export interface UserConsent {
  id: string
  user_id: string
  consent_type: 'privacy_policy' | 'health_data' | 'marketing'
  granted: boolean
  ip_address: string | null
  user_agent: string | null
  granted_at: string
  revoked_at: string | null
}

export interface PurchaseActivation {
  id: string
  email: string
  transaction_id: string
  status: 'pending' | 'otp_sent' | 'activated' | 'failed'
  otp_hash: string | null
  otp_expires_at: string | null
  otp_attempts: number
  webhook_payload: Record<string, unknown> | null
  activated_at: string | null
  created_at: string
}

// ========================
// Client-side types
// ========================

export interface Week1Day {
  day: number
  title: string
  meals: {
    breakfast: Meal
    lunch: Meal
    dinner: Meal
  }
  hydration: {
    water: string
    tea: string
    tip: string
  }
  exercise: {
    name: string
    desc: string
  }
  tip: string
  did_you_know: string
  motivation: string
}

export interface Week1Data {
  week: number
  days: Week1Day[]
}

export type FastingState = 'fasting' | 'eating' | 'idle'

export interface FastingSession {
  startedAt: number // timestamp
  endedAt: number | null
  targetDuration: number // in ms (16h = 57600000)
}

export type TabId = 'dashboard' | 'plan' | 'progress' | 'settings'
