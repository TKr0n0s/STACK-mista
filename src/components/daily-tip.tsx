'use client'

import { useState } from 'react'
import { Lightbulb, Sparkles, Heart } from 'lucide-react'

interface DailyTipProps {
  tip: string
  didYouKnow: string
  motivation: string
}

const categories = [
  { key: 'tip', label: 'Dica', icon: Lightbulb, bg: 'bg-amber-50', color: 'text-amber-600', border: 'border-amber-100' },
  { key: 'didYouKnow', label: 'Sabia?', icon: Sparkles, bg: 'bg-blue-50', color: 'text-blue-600', border: 'border-blue-100' },
  { key: 'motivation', label: 'Motivacao', icon: Heart, bg: 'bg-rose-50', color: 'text-rose-500', border: 'border-rose-100' },
] as const

type CategoryKey = (typeof categories)[number]['key']

export function DailyTip({ tip, didYouKnow, motivation }: DailyTipProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const category = categories[activeIndex]

  const content: Record<CategoryKey, string> = {
    tip,
    didYouKnow,
    motivation,
  }

  return (
    <div className="space-y-2">
      {/* Category pills */}
      <div className="flex gap-1.5 px-1">
        {categories.map((cat, i) => (
          <button
            key={cat.key}
            onClick={() => setActiveIndex(i)}
            className={`flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-medium transition-all ${
              i === activeIndex
                ? `${cat.bg} ${cat.color}`
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <cat.icon size={12} />
            {cat.label}
          </button>
        ))}
      </div>

      {/* Content card */}
      <div className={`rounded-2xl border ${category.border} ${category.bg} p-4`}>
        <p className="text-sm leading-relaxed text-foreground">
          {content[category.key]}
        </p>
      </div>
    </div>
  )
}
