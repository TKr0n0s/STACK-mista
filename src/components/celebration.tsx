'use client'

import { useEffect, useState } from 'react'

interface CelebrationProps {
  show: boolean
  message?: string
  emoji?: string
  onDone?: () => void
}

const CONFETTI_COLORS = ['#D85C7B', '#E8A87C', '#2D5D4F', '#7FB3A0', '#F0C987', '#60A5FA']

function ConfettiPiece({ index }: { index: number }) {
  const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length]
  const left = 10 + Math.random() * 80
  const delay = Math.random() * 0.3
  const size = 4 + Math.random() * 6
  const rotation = Math.random() * 360

  return (
    <div
      className="confetti-particle absolute rounded-sm"
      style={{
        left: `${left}%`,
        top: '40%',
        width: size,
        height: size * 0.6,
        backgroundColor: color,
        animationDelay: `${delay}s`,
        transform: `rotate(${rotation}deg)`,
      }}
    />
  )
}

export function Celebration({ show, message, emoji = '🎉', onDone }: CelebrationProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (show) {
      setVisible(true)
      const timer = setTimeout(() => {
        setVisible(false)
        onDone?.()
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [show, onDone])

  if (!visible) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
      {/* Confetti particles */}
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 24 }).map((_, i) => (
          <ConfettiPiece key={i} index={i} />
        ))}
      </div>

      {/* Center badge */}
      <div className="badge-pop flex flex-col items-center gap-2">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-xl">
          <span className="text-4xl">{emoji}</span>
        </div>
        {message && (
          <div className="rounded-full bg-white/95 px-4 py-1.5 shadow-lg backdrop-blur-sm">
            <p className="text-sm font-bold text-foreground">{message}</p>
          </div>
        )}
      </div>
    </div>
  )
}
