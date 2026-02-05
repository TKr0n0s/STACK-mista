'use client'

import { useTimer } from '@/hooks/use-timer'
import { Button } from '@/components/ui/button'
import { FastingPhases } from '@/components/fasting-phases'
import { Play, Square } from 'lucide-react'

export function FastingTimer() {
  const {
    fastingState,
    progress,
    hours,
    minutes,
    seconds,
    elapsedHours,
    startFasting,
    stopFasting,
    isComplete,
  } = useTimer()

  const isFasting = fastingState === 'fasting'

  const size = 240
  const strokeWidth = 8
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - progress * circumference

  function pad(n: number) {
    return n.toString().padStart(2, '0')
  }

  return (
    <div className="relative overflow-hidden rounded-3xl glass-card">
      {/* Dramatic warm radial glow */}
      <div
        className="absolute inset-0"
        style={{
          background: isFasting
            ? 'radial-gradient(ellipse at 50% 30%, rgba(216,92,123,0.18) 0%, rgba(232,168,124,0.10) 40%, rgba(216,92,123,0.04) 70%, transparent 100%)'
            : 'radial-gradient(ellipse at 50% 40%, rgba(216,92,123,0.08) 0%, transparent 75%)',
        }}
      />
      {/* Decorative organic shapes for depth */}
      <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-primary/[0.06] blur-3xl" />
      <div className="absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-secondary/[0.05] blur-3xl" />
      {/* Organic blob behind timer for premium depth */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-gradient-to-br from-primary/8 to-transparent blur-2xl" />

      <div className={`relative flex flex-col items-center gap-4 px-6 py-8 ${isFasting ? 'timer-glow' : ''}`}>
        <div className="relative float-gentle" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90">
            {/* Outer faint ring */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius + 12}
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth={1}
              opacity={0.3}
            />
            {/* Track circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth={strokeWidth}
              opacity={0.35}
            />
            {/* Hour marks */}
            {Array.from({ length: 16 }).map((_, i) => {
              const angle = (i / 16) * 2 * Math.PI - Math.PI / 2
              const isMajor = i % 4 === 0
              const innerR = isMajor ? radius - 16 : radius - 10
              const outerR = radius - 5
              const x1 = size / 2 + innerR * Math.cos(angle)
              const y1 = size / 2 + innerR * Math.sin(angle)
              const x2 = size / 2 + outerR * Math.cos(angle)
              const y2 = size / 2 + outerR * Math.sin(angle)
              return (
                <line
                  key={i}
                  x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke={isMajor ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))'}
                  strokeWidth={isMajor ? 1.5 : 0.8}
                  opacity={isMajor ? 0.25 : 0.15}
                  strokeLinecap="round"
                />
              )
            })}
            {/* Progress arc */}
            {isFasting && (
              <>
                {/* Glow behind arc */}
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke="url(#timerGradient)"
                  strokeWidth={strokeWidth + 8}
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  opacity={0.15}
                  className="transition-[stroke-dashoffset] duration-1000 ease-linear"
                />
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={isComplete ? 'url(#completeGradient)' : 'url(#timerGradient)'}
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  className="transition-[stroke-dashoffset] duration-1000 ease-linear"
                />
              </>
            )}
            <defs>
              <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#D85C7B" />
                <stop offset="50%" stopColor="#E87A93" />
                <stop offset="100%" stopColor="#E8A87C" />
              </linearGradient>
              <linearGradient id="completeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#2D5D4F" />
                <stop offset="100%" stopColor="#7FB3A0" />
              </linearGradient>
            </defs>
          </svg>

          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {isFasting ? (
              <>
                <span className={`text-[10px] font-bold uppercase tracking-[0.2em] ${isComplete ? 'text-secondary' : 'text-primary/70'}`}>
                  {isComplete ? 'Completo!' : 'Em Jejum'}
                </span>
                <p className="mt-1 font-mono text-[44px] font-bold leading-none tabular-nums text-foreground tracking-tight">
                  {pad(hours)}:{pad(minutes)}
                </p>
                <p className="mt-0.5 font-mono text-sm text-muted-foreground/60 tabular-nums">
                  :{pad(seconds)}
                </p>
                <FastingPhases elapsedHours={elapsedHours} />
              </>
            ) : (
              <>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                  Janela Aberta
                </span>
                <p className="mt-1 text-[44px] font-bold leading-none text-foreground tracking-tight">16:8</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Pronta para jejuar?
                </p>
              </>
            )}
          </div>
        </div>

        <Button
          onClick={isFasting ? stopFasting : startFasting}
          size="lg"
          variant={isFasting ? 'outline' : 'default'}
          className={`group min-h-[56px] w-full max-w-[260px] text-[15px] font-semibold rounded-2xl gap-2 transition-all ${
            !isFasting ? 'gradient-primary text-white border-0 shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40' : 'border-2 hover:bg-card/50'
          }`}
        >
          {isFasting ? (
            <>
              <Square size={16} className="fill-current transition-transform group-hover:scale-110" />
              Parar Jejum
            </>
          ) : (
            <>
              <Play size={16} className="fill-current transition-transform group-hover:scale-110 group-hover:translate-x-0.5" />
              Iniciar Jejum
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
