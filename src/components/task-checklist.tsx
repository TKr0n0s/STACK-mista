'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { MealImage } from '@/components/meal-image'
import { Checkbox } from '@/components/ui/checkbox'
import { Celebration } from '@/components/celebration'
import { ChevronRight, Dumbbell, Check } from 'lucide-react'
import { db, type TaskCompletion } from '@/lib/db/schema'
import { useUserId } from '@/hooks/use-user-id'
import { enqueueSync } from '@/lib/sync/syncManager'
import type { Week1Day } from '@/lib/types'

interface TaskChecklistProps {
  day: Week1Day
}

type TaskType = TaskCompletion['taskType']

const mealLabels: Record<string, string> = {
  breakfast: 'Cafe da manha',
  lunch: 'Almoco',
  dinner: 'Jantar',
  exercise: 'Exercicio',
}

const mealEmojis: Record<string, string> = {
  breakfast: '\u2615',
  lunch: '\uD83C\uDF5C',
  dinner: '\uD83C\uDF19',
  exercise: '\uD83C\uDFCB\uFE0F',
}

function getToday() {
  return new Date().toISOString().split('T')[0]
}

export function TaskChecklist({ day }: TaskChecklistProps) {
  const [completed, setCompleted] = useState<Record<TaskType, boolean>>({
    breakfast: false,
    lunch: false,
    dinner: false,
    exercise: false,
  })
  const [showCelebration, setShowCelebration] = useState(false)
  const [lastToggled, setLastToggled] = useState<string | null>(null)
  const userId = useUserId()
  const router = useRouter()

  useEffect(() => {
    async function load() {
      try {
        const today = getToday()
        const tasks = await db.taskCompletions
          .where('[userId+date+taskType]')
          .between([userId, today, ''], [userId, today, '\uffff'])
          .toArray()

        const state: Record<string, boolean> = {}
        for (const task of tasks) {
          state[task.taskType] = task.completed
        }
        setCompleted((prev) => ({ ...prev, ...state }))
      } catch {
        // IndexedDB not available
      }
    }
    load()
  }, [userId])

  const toggleTask = useCallback(async function toggleTask(taskType: TaskType, e: React.MouseEvent) {
    e.stopPropagation()
    const newValue = !completed[taskType]
    const newCompleted = { ...completed, [taskType]: newValue }
    setCompleted(newCompleted)
    setLastToggled(newValue ? taskType : null)

    // Check if all tasks now completed
    if (newValue && Object.values(newCompleted).every(Boolean)) {
      setShowCelebration(true)
    }

    try {
      const today = getToday()
      const existing = await db.taskCompletions
        .where('[userId+date+taskType]')
        .equals([userId, today, taskType])
        .first()

      if (existing?.id) {
        await db.taskCompletions.update(existing.id, {
          completed: newValue,
          synced: false,
        })
      } else {
        await db.taskCompletions.add({
          userId,
          date: today,
          taskType,
          completed: newValue,
          synced: false,
        })
      }

      const fieldKey = `${taskType}_done` as const
      try {
        await enqueueSync('daily_progress', 'upsert', {
          date: today,
          [fieldKey]: newValue,
        })
      } catch {
        // Sync enqueue failed
      }
    } catch {
      // IndexedDB write failed
    }
  }, [completed, userId])

  function getMeal(type: TaskType) {
    switch (type) {
      case 'breakfast': return day.meals.breakfast
      case 'lunch': return day.meals.lunch
      case 'dinner': return day.meals.dinner
      default: return null
    }
  }

  const completedCount = Object.values(completed).filter(Boolean).length
  const tasks: TaskType[] = ['breakfast', 'lunch', 'dinner', 'exercise']

  return (
    <>
    <Celebration
      show={showCelebration}
      message="Todas as tarefas concluidas!"
      emoji="🏆"
      onDone={() => setShowCelebration(false)}
    />
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="h-1 w-3 rounded-full bg-primary/40" />
          <h3 className="text-sm font-semibold text-foreground">Refeicoes do Dia</h3>
        </div>
        <span className="text-xs text-muted-foreground font-medium">
          {completedCount}/{tasks.length}
        </span>
      </div>

      <div className="space-y-2 stagger-children">
        {tasks.map((taskType) => {
          const meal = getMeal(taskType)
          const isExercise = taskType === 'exercise'
          const isDone = completed[taskType]

          return (
            <div
              key={taskType}
              className={`flex items-center gap-3 rounded-2xl bg-card p-3 shadow-sm transition-all ${
                lastToggled === taskType ? 'glow-complete' : ''
              }`}
            >
              {/* Checkbox — toggles task */}
              <Checkbox
                checked={isDone}
                onCheckedChange={() => {
                  const fakeEvent = { stopPropagation: () => {} } as React.MouseEvent
                  toggleTask(taskType, fakeEvent)
                }}
                className="h-5 w-5 shrink-0"
                aria-label={`Marcar ${mealLabels[taskType]}`}
              />

              {/* Clickable area — navigates to day detail */}
              <div
                className="flex flex-1 items-center gap-3 min-w-0 cursor-pointer"
                onClick={() => router.push(`/day/${day.day}`)}
              >
                {/* Image or icon */}
                {isExercise ? (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-secondary/10">
                    <Dumbbell size={24} className="text-secondary" />
                  </div>
                ) : meal ? (
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-muted shadow-sm">
                    <MealImage
                      src={`/meals/${meal.image}`}
                      alt={meal.name}
                      fill
                      className="object-cover"
                      sizes="192px"
                      mealType={taskType}
                      priority={taskType === 'breakfast'}
                    />
                    {/* Green checkmark overlay when meal is done */}
                    {isDone && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500 shadow-sm">
                          <Check size={14} className="text-white" strokeWidth={3} />
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">{mealEmojis[taskType]}</span>
                    <span className="text-xs font-medium text-muted-foreground">
                      {mealLabels[taskType]}
                    </span>
                  </div>
                  <p className={`text-sm font-semibold truncate ${isDone ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                    {isExercise ? day.exercise.name : meal?.name}
                  </p>
                  {meal?.kcal && (
                    <span className="text-[11px] font-medium text-primary">
                      {meal.kcal} kcal
                    </span>
                  )}
                </div>

                <ChevronRight size={16} className="shrink-0 text-muted-foreground/50" />
              </div>
            </div>
          )
        })}
      </div>
    </div>
    </>
  )
}
