import { z } from 'zod'

const mealSchema = z.object({
  name: z.string().min(1),
  desc: z.string().min(1),
  kcal: z.number().min(0),
  image_url: z.string().url().optional(),
})

const daySchema = z.object({
  day: z.number().int().min(1).max(7),
  title: z.string().min(1),
  meals: z.object({
    breakfast: mealSchema,
    lunch: mealSchema,
    dinner: mealSchema,
  }),
  hydration: z.object({
    water: z.string(),
    tea: z.string(),
    tip: z.string(),
  }),
  exercise: z.object({
    name: z.string(),
    desc: z.string(),
  }),
  tip: z.string(),
  motivation: z.string(),
})

export const aiPlanSchema = z.object({
  summary: z.string().min(10),
  tips: z.array(z.string()).min(1),
  days: z.array(daySchema).length(7),
})

export type AIPlanJSON = z.infer<typeof aiPlanSchema>
export type AIPlanDay = z.infer<typeof daySchema>

/**
 * Strip markdown code fences that LLMs sometimes wrap JSON in.
 * e.g. ```json\n{...}\n``` → {...}
 */
export function stripCodeFences(text: string): string {
  return text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim()
}
