import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { dataEntryLimiter } from '@/lib/rate-limit'

const dailyProgressSchema = z.object({
  type: z.literal('daily').optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  water_cups: z.number().int().min(0).max(15).optional(),
  fasting_started_at: z.string().nullable().optional(),
  fasting_ended_at: z.string().nullable().optional(),
  breakfast_done: z.boolean().optional(),
  lunch_done: z.boolean().optional(),
  dinner_done: z.boolean().optional(),
  exercise_done: z.boolean().optional(),
  completed: z.boolean().optional(),
  week: z.number().int().positive().optional(),
  day_number: z.number().int().min(1).max(7).optional(),
})

const weeklyReflectionSchema = z.object({
  type: z.literal('weekly'),
  week_number: z.number().int().positive(),
  energy: z.enum(['great', 'good', 'ok', 'low', 'bad']),
  sleep: z.enum(['great', 'good', 'ok', 'bad', 'terrible']),
  mood: z.enum(['great', 'good', 'ok', 'tired', 'bad']),
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Rate limit
  const { success } = await dataEntryLimiter.limit(user.id)
  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const body = await request.json()

  // Route based on type
  if (body.type === 'weekly') {
    // Weekly reflection
    const parseResult = weeklyReflectionSchema.safeParse(body)
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid weekly reflection data', details: parseResult.error.issues },
        { status: 400 }
      )
    }

    const { type, ...reflectionData } = parseResult.data
    const { data, error } = await supabase
      .from('weekly_reflections')
      .upsert(
        { user_id: user.id, ...reflectionData },
        { onConflict: 'user_id,week_number' }
      )
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } else {
    // Daily progress
    const parseResult = dailyProgressSchema.safeParse(body)
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid daily progress data', details: parseResult.error.issues },
        { status: 400 }
      )
    }

    const { date, type: _type, ...progressData } = parseResult.data

    // Compute week and day_number if not provided (required NOT NULL columns)
    let { week, day_number } = progressData
    if (!week || !day_number) {
      const { data: profile } = await supabase
        .from('users')
        .select('current_week, created_at')
        .eq('id', user.id)
        .single()

      if (!week) {
        week = profile?.current_week ?? 1
      }
      if (!day_number) {
        // Compute day number from date relative to created_at, or fallback to day of week
        if (profile?.created_at) {
          const created = new Date(profile.created_at)
          const target = new Date(date)
          const daysSince = Math.floor((target.getTime() - created.getTime()) / 86400000)
          day_number = (daysSince % 7) + 1
        } else {
          // Fallback: 1=Monday through 7=Sunday
          const d = new Date(date).getUTCDay()
          day_number = d === 0 ? 7 : d
        }
      }
    }

    const { data, error } = await supabase
      .from('daily_progress')
      .upsert(
        { user_id: user.id, date, week, day_number, ...progressData },
        { onConflict: 'user_id,date' }
      )
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  }
}
