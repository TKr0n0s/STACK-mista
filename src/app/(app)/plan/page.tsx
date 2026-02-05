'use client'

import { useState, useEffect, type ComponentPropsWithoutRef } from 'react'
import ReactMarkdown from 'react-markdown'
import { Button } from '@/components/ui/button'
import { Star, Lock, RefreshCw, Loader2, Sparkles, Clock, Utensils, Droplets, Heart, Lightbulb } from 'lucide-react'
import { ProfilingModal } from '@/components/profiling-modal'

interface PlanData {
  plan_content: string
  regenerations_today: number
}

// Map section keywords to icons and colors
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

// Clean numbered prefixes like "1." "2." from headings
function cleanHeading(text: string): string {
  return text.replace(/^\d+\.\s*/, '')
}

// Custom markdown components for styled rendering
const markdownComponents = {
  h1: ({ children, ...props }: ComponentPropsWithoutRef<'h1'>) => {
    const text = String(children)
    return (
      <div className="mb-4 mt-2" {...props}>
        <h2 className="text-lg font-bold text-foreground">{cleanHeading(text)}</h2>
      </div>
    )
  },
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
  h3: ({ children, ...props }: ComponentPropsWithoutRef<'h3'>) => {
    const text = String(children)
    return (
      <p className="mt-4 mb-1.5 text-sm font-bold text-foreground" {...props}>
        {cleanHeading(text)}
      </p>
    )
  },
  p: ({ children, ...props }: ComponentPropsWithoutRef<'p'>) => (
    <p className="text-[13px] leading-relaxed text-muted-foreground mb-2" {...props}>
      {children}
    </p>
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

export default function PlanPage() {
  const [profileCompleted, setProfileCompleted] = useState(false)
  const [profilingOpen, setProfilingOpen] = useState(false)
  const [plan, setPlan] = useState<PlanData | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    try {
      const res = await fetch('/api/user/profile')
      if (res.ok) {
        const data = await res.json()
        setProfileCompleted(data.profile_completed || false)

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
        if (data.plan_content) setPlan(data)
      }
    } catch {
      // no plan yet
    }
  }

  async function generatePlan() {
    setGenerating(true)
    setError('')
    try {
      const res = await fetch('/api/generate-plan', {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao gerar plano')
      setPlan(data)
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
                <h2 className="text-lg font-bold">
                  Complete seu perfil
                </h2>
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
              <p className="text-sm font-semibold text-foreground">
                Gerando seu plano...
              </p>
              <p className="text-xs text-muted-foreground">
                Nossa IA está analisando seu perfil e criando
                recomendações personalizadas.
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
                  Jejum Intermitente 16:8
                </p>
              </div>
            </div>
          </div>

          {/* Plan content — styled markdown */}
          <div className="rounded-2xl bg-card p-5 shadow-sm">
            <ReactMarkdown components={markdownComponents}>
              {plan.plan_content}
            </ReactMarkdown>
          </div>

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
