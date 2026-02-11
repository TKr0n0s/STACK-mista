import type { Meal, Week1Day } from '@/lib/types'
import { containsProhibitedFood, getExpandedFoodsToAvoid } from '@/lib/content/medical-claims'

type MealType = 'breakfast' | 'lunch' | 'dinner'

const SAFE_MEAL_FALLBACKS: Record<MealType, { name: string; desc: string; image: string }> = {
  breakfast: {
    name: 'Cafe da manha personalizado',
    desc: 'Refeicao ajustada para respeitar os alimentos proibidos do seu perfil.',
    image: 'yogurt-granola.jpg',
  },
  lunch: {
    name: 'Almoco personalizado',
    desc: 'Refeicao ajustada para respeitar os alimentos proibidos do seu perfil.',
    image: 'rice-beans.jpg',
  },
  dinner: {
    name: 'Jantar personalizado',
    desc: 'Refeicao ajustada para respeitar os alimentos proibidos do seu perfil.',
    image: 'creamy-veggie-soup.jpg',
  },
}

function sanitizeMeal(
  meal: Meal,
  type: MealType,
  expandedFoodsToAvoid: string[]
): Meal {
  const fullMealText = `${meal.name} ${meal.desc}`
  if (!containsProhibitedFood(fullMealText, expandedFoodsToAvoid)) {
    return meal
  }

  const fallback = SAFE_MEAL_FALLBACKS[type]
  return {
    ...meal,
    name: fallback.name,
    desc: fallback.desc,
    image: fallback.image,
  }
}

export function sanitizeDayForFoodSafety(
  day: Week1Day,
  foodsToAvoid: string | string[] | null | undefined
): Week1Day {
  const expandedFoodsToAvoid = getExpandedFoodsToAvoid(foodsToAvoid)
  if (expandedFoodsToAvoid.length === 0) {
    return day
  }

  return {
    ...day,
    meals: {
      breakfast: sanitizeMeal(day.meals.breakfast, 'breakfast', expandedFoodsToAvoid),
      lunch: sanitizeMeal(day.meals.lunch, 'lunch', expandedFoodsToAvoid),
      dinner: sanitizeMeal(day.meals.dinner, 'dinner', expandedFoodsToAvoid),
    },
  }
}
