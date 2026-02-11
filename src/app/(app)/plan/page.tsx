'use client'

import { useState, useEffect, type ComponentPropsWithoutRef } from 'react'
import ReactMarkdown from 'react-markdown'
import { Button } from '@/components/ui/button'
import { MealImage } from '@/components/meal-image'
import {
  Star, Lock, RefreshCw, Loader2, Sparkles, Clock, Utensils,
  Droplets, Heart, Lightbulb, ChevronLeft, ChevronRight, Dumbbell,
} from 'lucide-react'
import { ProfilingModal } from '@/components/profiling-modal'
import { getFastingRatio } from '@/lib/fasting-utils'
import { getMealImage } from '@/lib/meal-images'
import type { AIPlanJSON, AIPlanDay } from '@/lib/ai-plan-schema'
import { buildAllForbiddenTerms, containsProhibitedFood, type UserFoodProfile } from '@/lib/content/medical-claims'
import { SAFE_MEAL_FALLBACKS } from '@/lib/content/day-safety'

interface PlanData {
  plan_content: string
  regenerations_today: number
}

function tryParseAIPlan(content: string): AIPlanJSON | null {
  try {
    const parsed = JSON.parse(content)
    if (parsed?.days?.length === 7 && parsed.summary) return parsed as AIPlanJSON
  } catch { /* markdown fallback */ }
  return null
}

function sanitizeAIPlanDay(day: AIPlanDay, forbidden: string[]): AIPlanDay {
  if (forbidden.length === 0) return day
  const check = (text: string) => containsProhibitedFood(text, forbidden)
  const safeMeal = (meal: { name: string; desc: string; kcal: number }, type: 'breakfast' | 'lunch' | 'dinner') => {
    if (check(`${meal.name} ${meal.desc}`)) {
      const fb = SAFE_MEAL_FALLBACKS[type]
      return { name: fb.name, desc: fb.desc, kcal: meal.kcal }
    }
    return meal
  }
  return {
    ...day,
    meals: {
      breakfast: safeMeal(day.meals.breakfast, 'breakfast'),
      lunch: safeMeal(day.meals.lunch, 'lunch'),
      dinner: safeMeal(day.meals.dinner, 'dinner'),
    },
  }
}

// ─── Structured JSON day card ───────────────────────────────────────

function DayCard({ day }: { day: AIPlanDay }) {
  const meals = [
    { key: 'breakfast', label: 'Cafe da manha', emoji: '\u2615', meal: day.meals.breakfast },
    { key: 'lunch', label: 'Almoco', emoji: '\uD83C\uDF5C', meal: day.meals.lunch },
    { key: 'dinner', label: 'Jantar', emoji: '\uD83C\uDF19', meal: day.meals.dinner },
  ] as const

  return (
    <div className="space-y-3">
      <h3 className="text-[15px] font-bold text-foreground">{day.title}</h3>

      {meals.map(({ key, label, emoji, meal }) => (
        <div key={key} className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-sm">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-muted shadow-sm">
            <MealImage
              src={`/meals/${getMealImage(meal.name, key)}`}
              alt={meal.name}
              fill
              className="object-cover"
              sizes="192px"
              mealType={key}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs">{emoji}</span>
              <span className="text-xs font-medium text-muted-foreground">{label}</span>
            </div>
            <p className="text-sm font-semibold text-foreground truncate">{meal.name}</p>
            <span className="text-[11px] font-medium text-primary">{meal.kcal} kcal</span>
          </div>
        </div>
      ))}

      {/* Description for first meal visible */}
      <div className="rounded-xl bg-muted/50 p-3 space-y-2">
        {meals.map(({ key, meal }) => (
          <p key={key} className="text-[12px] leading-relaxed text-muted-foreground">
            <span className="font-semibold text-foreground">{meal.name}:</span> {meal.desc}
          </p>
        ))}
      </div>

      {/* Hydration + Exercise */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Droplets size={14} className="text-blue-500" />
            <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">Hidratacao</span>
          </div>
          <p className="text-[11px] text-blue-600 dark:text-blue-300">{day.hydration.water} agua + {day.hydration.tea}</p>
          <p className="text-[10px] text-blue-500/70 mt-0.5">{day.hydration.tip}</p>
        </div>
        <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Dumbbell size={14} className="text-amber-600" />
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Exercicio</span>
          </div>
          <p className="text-[11px] text-amber-600 dark:text-amber-300">{day.exercise.name}</p>
          <p className="text-[10px] text-amber-500/70 mt-0.5">{day.exercise.desc}</p>
        </div>
      </div>

      {/* Tip + Motivation */}
      <div className="rounded-xl bg-primary/5 p-3 space-y-1">
        <div className="flex items-center gap-1.5">
          <Lightbulb size={13} className="text-primary" />
          <span className="text-xs font-semibold text-primary">Dica do dia</span>
        </div>
        <p className="text-[12px] text-muted-foreground">{day.tip}</p>
      </div>
      <p className="text-center text-[12px] italic text-muted-foreground/80">{day.motivation}</p>
    </div>
  )
}

// ─── Markdown fallback components (old plans) ───────────────────────

function getSectionStyle(text: string): { icon: typeof Clock; color: string; bg: string } | null {
  const lower = text.toLowerCase()
  if (lower.includes('horário') || lower.includes('horario') || lower.includes('janela') || lower.includes('jejum'))
    return { icon: Clock, color: 'text-primary', bg: 'bg-primary/10' }
  if (lower.includes('comer') || lower.includes('refeição') || lower.includes('refeicao') || lower.includes('alimentação') || lower.includes('alimentacao'))
    return { icon: Utensils, color: 'text-amber-600', bg: 'bg-amber-50' }
  if (lower.includes('beber') || lower.includes('hidrat') || lower.includes('água') || lower.includes('agua'))
    return { icon: Droplets, color: 'text-blue-500', bg: 'bg-blue-50' }
  if (lower.includes('dica') || lower.includes('extra') || lower.includes('acompanhamento'))
    return { icon: Lightbulb, color: 'text-amber-500', bg: 'bg-amber-50' }
  if (lower.includes('saúde') || lower.includes('saude') || lower.includes('bem-estar'))
    return { icon: Heart, color: 'text-rose-500', bg: 'bg-rose-50' }
  return null
}

function cleanHeading(text: string): string {
  return text.replace(/^\d+\.\s*/, '')
}

const markdownComponents = {
  h1: ({ children, ...props }: ComponentPropsWithoutRef<'h1'>) => (
    <div className="mb-4 mt-2" {...props}>
      <h2 className="text-lg font-bold text-foreground">{cleanHeading(String(children))}</h2>
    </div>
  ),
  h2: ({ children, ...props }: ComponentPropsWithoutRef<'h2'>) => {
    const text = String(children)
    const style = getSectionStyle(text)
    const Icon = style?.icon
    return (
      <div className="mt-5 mb-3 flex items-center gap-2.5" {...props}>
        {Icon && (
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${style.bg}`}>
            <Icon size={16} className={style.color} />
          </div>
        )}
        <h3 className="text-[15px] font-bold text-foreground">{cleanHeading(text)}</h3>
      </div>
    )
  },
  h3: ({ children, ...props }: ComponentPropsWithoutRef<'h3'>) => (
    <p className="mt-4 mb-1.5 text-sm font-bold text-foreground" {...props}>
      {cleanHeading(String(children))}
    </p>
  ),
  p: ({ children, ...props }: ComponentPropsWithoutRef<'p'>) => (
    <p className="text-[13px] leading-relaxed text-muted-foreground mb-2" {...props}>{children}</p>
  ),
  ul: ({ children, ...props }: ComponentPropsWithoutRef<'ul'>) => (
    <ul className="space-y-1.5 mb-3" {...props}>{children}</ul>
  ),
  li: ({ children, ...props }: ComponentPropsWithoutRef<'li'>) => (
    <li className="flex items-start gap-2 text-[13px] leading-relaxed text-muted-foreground" {...props}>
      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/40" />
      <span>{children}</span>
    </li>
  ),
  strong: ({ children, ...props }: ComponentPropsWithoutRef<'strong'>) => (
    <strong className="font-semibold text-foreground" {...props}>{children}</strong>
  ),
  em: ({ children, ...props }: ComponentPropsWithoutRef<'em'>) => (
    <em className="text-primary/80 not-italic font-medium" {...props}>{children}</em>
  ),
  hr: () => <div className="my-4 h-px bg-border/60" />,
}

// ─── Main page ──────────────────────────────────────────────────────

export default function PlanPage() {
  const [profileCompleted, setProfileCompleted] = useState(false)
  const [profilingOpen, setProfilingOpen] = useState(false)
  const [plan, setPlan] = useState<PlanData | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [fastingStartHour, setFastingStartHour] = useState(20)
  const [fastingEndHour, setFastingEndHour] = useState(12)
  const [selectedDay, setSelectedDay] = useState(0)
  const [forbiddenTerms, setForbiddenTerms] = useState<string[]>([])

  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    try {
      const res = await fetch('/api/user/profile')
      if (res.ok) {
        const data = await res.json()
        setProfileCompleted(data.profile_completed || false)
        setFastingStartHour(data.fasting_start_hour ?? 20)
        setFastingEndHour(data.fasting_end_hour ?? 12)
        setForbiddenTerms(buildAllForbiddenTerms({
          foods_to_avoid: data.foods_to_avoid || null,
          dietary_restrictions: data.dietary_restrictions || null,
          protein_preference: data.protein_preference || null,
        }))

        if (data.profile_completed) {
          await loadPlan()
        }
      }
    } catch {
      // offline
    } finally {
      setLoading(false)
    }
  }

  async function loadPlan() {
    try {
      const res = await fetch('/api/generate-plan', { method: 'GET' })
      if (res.ok) {
        const data = await res.json()
        if (data.plan_content) {
          setPlan(data)
          // Auto-regenerate if plan is from a previous week
          if (data.stale && data.regenerations_today < 3) {
            await generatePlan()
          }
        }
      }
    } catch {
      // no plan yet
    }
  }

  async function generatePlan() {
    setGenerating(true)
    setError('')
    try {
      const res = await fetch('/api/generate-plan', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao gerar plano')
      setPlan(data)
      setSelectedDay(0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado')
    } finally {
      setGenerating(false)
    }
  }

  function handleProfilingComplete() {
    setProfileCompleted(true)
    generatePlan()
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const aiPlan = plan ? tryParseAIPlan(plan.plan_content) : null

  return (
    <div className="space-y-5 page-enter">
      <div className="relative">
        <div className="absolute -top-8 -left-8 h-28 w-28 rounded-full bg-primary/5 blur-2xl" />
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Inteligência Artificial
        </p>
        <h1 className="text-2xl font-bold">Meu Plano</h1>
      </div>

      {!profileCompleted ? (
        <>
          <div className="rounded-2xl border-2 border-dashed border-primary/20 bg-primary/5 p-8">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full gradient-primary shadow-lg shadow-primary/20">
                <Lock size={28} className="text-white" />
              </div>
              <div className="space-y-2">
                <h2 className="text-lg font-bold">Complete seu perfil</h2>
                <p className="text-sm text-muted-foreground max-w-[280px]">
                  Preencha seus dados e nossa IA criará um plano
                  de jejum 100% personalizado para você.
                </p>
              </div>
              <Button
                size="lg"
                className="mt-2 gradient-primary text-white border-0 shadow-lg shadow-primary/20 rounded-xl"
                onClick={() => setProfilingOpen(true)}
              >
                <Star size={18} className="mr-2" />
                Completar Perfil
              </Button>
            </div>
          </div>

          <ProfilingModal
            open={profilingOpen}
            onOpenChange={setProfilingOpen}
            onComplete={handleProfilingComplete}
          />
        </>
      ) : generating ? (
        <div className="rounded-2xl bg-card p-10 shadow-sm">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="relative">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <Sparkles className="absolute -right-1 -top-1 h-5 w-5 text-amber-400 animate-pulse" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">Gerando seu plano...</p>
              <p className="text-xs text-muted-foreground">
                Nossa IA está analisando seu perfil e criando recomendações personalizadas.
              </p>
            </div>
          </div>
        </div>
      ) : plan ? (
        <>
          {/* Plan hero */}
          <div className="relative overflow-hidden rounded-2xl gradient-primary p-5">
            <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-white/10 blur-xl" />
            <div className="absolute -bottom-4 -left-4 h-20 w-20 rounded-full bg-black/5 blur-lg" />
            <div className="relative flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                <Sparkles size={20} className="text-white" />
              </div>
              <div>
                <p className="text-xs font-medium text-white/70 uppercase tracking-wide">
                  Plano Personalizado
                </p>
                <p className="text-[15px] font-bold text-white">
                  Jejum Intermitente {getFastingRatio(fastingStartHour, fastingEndHour).label}
                </p>
              </div>
            </div>
          </div>

          {aiPlan ? (
            <>
              {/* Summary */}
              <div className="rounded-2xl bg-card p-4 shadow-sm">
                <p className="text-[13px] leading-relaxed text-muted-foreground">{aiPlan.summary}</p>
                {aiPlan.tips.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {aiPlan.tips.map((tip, i) => (
                      <li key={i} className="flex items-start gap-2 text-[12px] text-muted-foreground">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/40" />
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Day selector */}
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={selectedDay === 0}
                  onClick={() => setSelectedDay((d) => d - 1)}
                >
                  <ChevronLeft size={18} />
                </Button>
                <div className="flex gap-1.5">
                  {aiPlan.days.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedDay(i)}
                      className={`h-8 w-8 rounded-full text-xs font-semibold transition-all ${
                        i === selectedDay
                          ? 'gradient-primary text-white shadow-sm'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={selectedDay === 6}
                  onClick={() => setSelectedDay((d) => d + 1)}
                >
                  <ChevronRight size={18} />
                </Button>
              </div>

              {/* Day content */}
              <div className="rounded-2xl bg-card p-4 shadow-sm">
                <DayCard day={sanitizeAIPlanDay(aiPlan.days[selectedDay], forbiddenTerms)} />
              </div>
            </>
          ) : (
            /* Markdown fallback for old plans */
            <>
              {forbiddenTerms.length > 0 && (
                <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3">
                  <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">
                    Este plano foi gerado antes das suas restricoes atuais. Gere um novo plano para garantir que respeite suas preferencias.
                  </p>
                </div>
              )}
              <div className="rounded-2xl bg-card p-5 shadow-sm">
                <ReactMarkdown components={markdownComponents}>
                  {plan.plan_content}
                </ReactMarkdown>
              </div>
            </>
          )}

          {/* Regenerate */}
          {plan.regenerations_today < 3 && (
            <Button
              variant="outline"
              className="w-full rounded-xl gap-2"
              onClick={generatePlan}
              disabled={generating}
            >
              <RefreshCw size={16} />
              Gerar Novo Plano ({3 - plan.regenerations_today} restantes hoje)
            </Button>
          )}
        </>
      ) : (
        <div className="rounded-2xl bg-card p-8 shadow-sm">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Sparkles size={24} className="text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">
              Seu plano ainda não foi gerado.
            </p>
            <Button
              onClick={generatePlan}
              disabled={generating}
              className="gradient-primary text-white border-0 shadow-lg shadow-primary/20 rounded-xl"
            >
              {generating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles size={16} className="mr-2" />
              )}
              Gerar Meu Plano
            </Button>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-destructive/10 p-3 text-center">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}
    </div>
  )
}
