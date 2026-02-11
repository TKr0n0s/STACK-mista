import { type AIPlanJSON } from '@/lib/ai-plan-schema'
import { buildAllForbiddenTerms, validateAIOutput, type UserFoodProfile } from './medical-claims'

interface FallbackProfile extends UserFoodProfile {
  name?: string | null
}

interface Meal {
  name: string
  desc: string
  kcal: number
}

// Pool of safe meals organized by meal type and protein category.
// Each meal is tagged with compatible protein groups.
// "universal" means compatible with all profiles (vegan-safe base).
const MEAL_POOL: Record<'breakfast' | 'lunch' | 'dinner', Meal[]> = {
  breakfast: [
    { name: 'Vitamina de Banana com Aveia', desc: 'Vitamina de banana com aveia, canela e mel. Rica em fibras e energia para comecar o dia.', kcal: 280 },
    { name: 'Tapioca com Queijo Cottage', desc: 'Tapioca recheada com queijo cottage e tomate seco. Leve e proteica.', kcal: 250 },
    { name: 'Mingau de Aveia com Frutas', desc: 'Mingau de aveia com morangos, banana fatiada e chia. Fonte de fibras e vitaminas.', kcal: 310 },
    { name: 'Acai com Granola', desc: 'Tigela de acai puro com granola sem gluten, banana e mel.', kcal: 350 },
    { name: 'Panqueca de Banana', desc: 'Panquecas de banana com aveia, canela e um fio de mel. Sem farinha de trigo.', kcal: 290 },
    { name: 'Omelete de Espinafre', desc: 'Omelete com espinafre, tomate cereja e ervas finas. Proteica e nutritiva.', kcal: 260 },
    { name: 'Iogurte Natural com Granola', desc: 'Iogurte natural com granola caseira, frutas vermelhas e mel.', kcal: 300 },
    { name: 'Ovos Mexidos com Torrada', desc: 'Ovos mexidos com ervas, acompanhados de torrada integral e abacate.', kcal: 320 },
    { name: 'Smoothie Verde Energizante', desc: 'Smoothie de espinafre, banana, abacaxi e agua de coco. Refrescante e nutritivo.', kcal: 220 },
    { name: 'Tapioca de Frango Desfiado', desc: 'Tapioca recheada com frango desfiado, requeijao light e oregano.', kcal: 310 },
    { name: 'Crepioca Proteica', desc: 'Crepioca (tapioca com ovo) recheada com queijo branco e tomate.', kcal: 280 },
    { name: 'Frutas com Pasta de Amendoim', desc: 'Mix de frutas da estacao com pasta de amendoim natural e chia.', kcal: 270 },
    { name: 'Pao Integral com Abacate', desc: 'Pao integral com pasta de abacate, tomate e azeite extra virgem.', kcal: 290 },
    { name: 'Tofu Mexido com Legumes', desc: 'Tofu mexido com tomate, cebola, curcuma e salsa. Proteina vegetal completa.', kcal: 240 },
  ],
  lunch: [
    { name: 'Frango Grelhado com Salada', desc: 'Peito de frango grelhado com salada verde, tomate, pepino e azeite.', kcal: 420 },
    { name: 'Salmao com Legumes', desc: 'File de salmao grelhado com brocolis, cenoura e batata doce.', kcal: 450 },
    { name: 'Salada Proteica de Grao-de-Bico', desc: 'Salada de grao-de-bico com tomate, pepino, cebola roxa e azeite.', kcal: 380 },
    { name: 'Arroz Integral com Feijao e Legumes', desc: 'Arroz integral com feijao preto, brocolis, cenoura e abobora.', kcal: 400 },
    { name: 'Tilapia Assada com Arroz', desc: 'File de tilapia assada com arroz integral, salada e legumes.', kcal: 410 },
    { name: 'Wrap de Frango com Salada', desc: 'Wrap integral com peito de frango desfiado, alface, tomate e molho de iogurte.', kcal: 380 },
    { name: 'Carne Moida com Abobora', desc: 'Carne moida magra refogada com abobora, arroz integral e salada verde.', kcal: 430 },
    { name: 'Lentilha com Legumes', desc: 'Sopa de lentilha com cenoura, batata, couve e temperos naturais.', kcal: 350 },
    { name: 'Quiche de Legumes', desc: 'Quiche de legumes com ovos, espinafre, tomate seco e queijo branco.', kcal: 370 },
    { name: 'Bowl de Quinoa com Legumes', desc: 'Bowl de quinoa com abobora assada, grao-de-bico, rucula e molho tahine.', kcal: 390 },
    { name: 'Picanha Grelhada com Salada', desc: 'Picanha grelhada magra com salada completa e mandioca cozida.', kcal: 480 },
    { name: 'Poke Bowl de Atum', desc: 'Bowl de arroz com atum fresco, pepino, manga, edamame e molho shoyu.', kcal: 420 },
    { name: 'Omelete Recheada com Salada', desc: 'Omelete grande recheada com legumes, queijo e acompanhada de salada.', kcal: 360 },
    { name: 'Strogonoff de Frango Light', desc: 'Strogonoff de frango com creme de leite light, arroz integral e salada.', kcal: 440 },
    { name: 'Tofu Grelhado com Legumes', desc: 'Tofu grelhado com legumes salteados, arroz integral e molho de soja.', kcal: 360 },
  ],
  dinner: [
    { name: 'Sopa de Legumes', desc: 'Sopa cremosa de abobora com gengibre, acompanhada de torradas.', kcal: 280 },
    { name: 'Salada Caesar com Frango', desc: 'Salada caesar com frango grelhado, croutons integrais e parmesao.', kcal: 350 },
    { name: 'Peixe Assado com Legumes', desc: 'File de peixe branco assado com abobrinha, tomate e ervas frescas.', kcal: 320 },
    { name: 'Omelete de Legumes', desc: 'Omelete recheada com espinafre, cogumelos, tomate e queijo branco.', kcal: 290 },
    { name: 'Creme de Abobora', desc: 'Creme de abobora com gengibre, sementes de abobora e croutons.', kcal: 250 },
    { name: 'Frango ao Forno com Batata Doce', desc: 'Sobrecoxa de frango ao forno com batata doce e salada verde.', kcal: 380 },
    { name: 'Salada Completa com Grao-de-Bico', desc: 'Salada completa com grao-de-bico, tomate, pepino, cenoura e azeite.', kcal: 310 },
    { name: 'Wrap Integral de Atum', desc: 'Wrap integral com atum, alface, milho e molho de ervas.', kcal: 330 },
    { name: 'Hamburguer de Lentilha', desc: 'Hamburguer caseiro de lentilha com salada e batata doce assada.', kcal: 340 },
    { name: 'Sopa de Frango com Legumes', desc: 'Sopa nutritiva de frango desfiado com cenoura, batata e couve.', kcal: 300 },
    { name: 'Carne Grelhada com Salada', desc: 'Bife grelhado magro com salada colorida e batata doce.', kcal: 370 },
    { name: 'Escondidinho de Frango', desc: 'Escondidinho de frango com pure de mandioca e gratinado leve.', kcal: 360 },
    { name: 'Ovos Cozidos com Salada', desc: 'Ovos cozidos com salada verde completa, abacate e azeite.', kcal: 280 },
    { name: 'Tofu Refogado com Legumes', desc: 'Tofu refogado com legumes variados, gergelim e arroz integral.', kcal: 310 },
  ],
}

const HYDRATION_OPTIONS = [
  { water: '2L', tea: 'Cha verde com limao', tip: 'Beba um copo ao acordar para hidratar o corpo.' },
  { water: '2L', tea: 'Cha de camomila', tip: 'Mantenha uma garrafinha sempre por perto.' },
  { water: '2L', tea: 'Cha de hortela', tip: 'Adicione rodelas de limao na agua para variar.' },
  { water: '2.5L', tea: 'Cha de gengibre com limao', tip: 'Beba cha morno entre as refeicoes para saciedade.' },
  { water: '2L', tea: 'Cha de hibisco', tip: 'Agua com pepino e hortela e uma opcao refrescante.' },
  { water: '2L', tea: 'Cha de erva-cidreira', tip: 'Evite liquidos durante as refeicoes, prefira 30 min antes ou depois.' },
  { water: '2.5L', tea: 'Cha de canela', tip: 'Comece o dia com um copo grande de agua morna.' },
]

const EXERCISE_OPTIONS = [
  { name: 'Caminhada leve', desc: 'Caminhada de 30 minutos em ritmo moderado ao ar livre.' },
  { name: 'Alongamento matinal', desc: 'Sequencia de 20 minutos de alongamento para todo o corpo.' },
  { name: 'Yoga suave', desc: 'Pratica de yoga de 30 minutos com foco em respiracao e flexibilidade.' },
  { name: 'Pilates', desc: 'Sessao de pilates de 25 minutos para fortalecimento do core.' },
  { name: 'Caminhada no parque', desc: 'Caminhada de 40 minutos em ambiente natural para relaxar.' },
  { name: 'Exercicios funcionais', desc: 'Circuito de 20 minutos com agachamento, prancha e lunges.' },
  { name: 'Danca suave', desc: 'Sessao de 30 minutos de danca livre ou ritmos leves em casa.' },
]

const TIPS = [
  'Coma devagar e mastigue bem cada garfada.',
  'Prepare suas refeicoes com antecedencia para evitar escolhas ruins.',
  'Durma pelo menos 7 horas por noite para melhores resultados.',
  'Inclua vegetais coloridos em todas as refeicoes.',
  'Evite distracao ao comer — foque na refeicao.',
  'Beba agua regularmente ao longo do dia.',
  'Cozinhar em casa e mais saudavel e economico.',
]

const MOTIVATIONS = [
  'Cada dia e uma nova oportunidade de cuidar de voce!',
  'Voce esta no caminho certo. Continue firme!',
  'Pequenos passos todos os dias levam a grandes resultados.',
  'Seu corpo agradece cada escolha saudavel que voce faz.',
  'Confie no processo. Os resultados virao!',
  'Voce merece se sentir bem e ter energia todos os dias.',
  'A consistencia e mais poderosa que a perfeicao.',
]

/**
 * Filters a meal pool, keeping only meals whose serialized content
 * passes the user's forbidden terms check.
 */
function filterSafeMeals(meals: Meal[], forbidden: string[]): Meal[] {
  if (forbidden.length === 0) return meals
  return meals.filter(meal => {
    const content = `${meal.name} ${meal.desc}`
    const result = validateAIOutput(content, forbidden)
    return result.valid
  })
}

/**
 * Select N meals from pool, cycling to avoid repetition.
 * If not enough safe meals, allows reuse.
 */
function selectMeals(pool: Meal[], count: number): Meal[] {
  if (pool.length === 0) {
    // Absolute fallback — should never happen with our meal pool
    return Array.from({ length: count }, (_, i) => ({
      name: `Refeicao saudavel ${i + 1}`,
      desc: 'Prato equilibrado com proteinas, carboidratos e vegetais frescos.',
      kcal: 350,
    }))
  }
  const result: Meal[] = []
  for (let i = 0; i < count; i++) {
    result.push(pool[i % pool.length])
  }
  return result
}

/**
 * Builds a deterministic safe fallback plan in AIPlanJSON format.
 * Used by generate-plan when AI fails 3x validation.
 * Every meal passes buildAllForbiddenTerms validation.
 */
export function buildSafeFallbackPlan(profile: FallbackProfile): AIPlanJSON {
  const forbidden = buildAllForbiddenTerms(profile)
  const name = profile.name || 'voce'

  const safeBreakfasts = filterSafeMeals(MEAL_POOL.breakfast, forbidden)
  const safeLunches = filterSafeMeals(MEAL_POOL.lunch, forbidden)
  const safeDinners = filterSafeMeals(MEAL_POOL.dinner, forbidden)

  const breakfasts = selectMeals(safeBreakfasts, 7)
  const lunches = selectMeals(safeLunches, 7)
  const dinners = selectMeals(safeDinners, 7)

  return {
    summary: `${name}, preparamos um plano alimentar equilibrado e seguro para os proximos 7 dias. Todas as refeicoes respeitam suas restricoes e preferencias.`,
    tips: TIPS.slice(0, 3),
    days: Array.from({ length: 7 }, (_, i) => ({
      day: i + 1,
      title: `Dia ${i + 1} — ${MOTIVATIONS[i]}`,
      meals: {
        breakfast: breakfasts[i],
        lunch: lunches[i],
        dinner: dinners[i],
      },
      hydration: HYDRATION_OPTIONS[i],
      exercise: EXERCISE_OPTIONS[i],
      tip: TIPS[i],
      motivation: `${name}, ${MOTIVATIONS[i].toLowerCase()}`,
    })),
  }
}

/**
 * Flat day format used by generate-week route.
 */
export interface WeekDayFlat {
  day_number: number
  title: string
  breakfast_name: string
  breakfast_desc: string
  lunch_name: string
  lunch_desc: string
  dinner_name: string
  dinner_desc: string
  water_target: string
  tea_name: string
  tea_tip: string
  exercise_name: string
  exercise_desc: string
  tip_of_day: string
  did_you_know: string
  motivation: string
}

/**
 * Builds a deterministic safe fallback in flat format for generate-week.
 * Used when AI fails 3x validation for week generation.
 */
export function buildSafeFallbackWeek(
  profile: FallbackProfile,
  weekNumber: number
): WeekDayFlat[] {
  const forbidden = buildAllForbiddenTerms(profile)
  const name = profile.name || 'voce'

  const safeBreakfasts = filterSafeMeals(MEAL_POOL.breakfast, forbidden)
  const safeLunches = filterSafeMeals(MEAL_POOL.lunch, forbidden)
  const safeDinners = filterSafeMeals(MEAL_POOL.dinner, forbidden)

  const breakfasts = selectMeals(safeBreakfasts, 7)
  const lunches = selectMeals(safeLunches, 7)
  const dinners = selectMeals(safeDinners, 7)

  return Array.from({ length: 7 }, (_, i) => {
    const hydration = HYDRATION_OPTIONS[i]
    const exercise = EXERCISE_OPTIONS[i]
    return {
      day_number: i + 1,
      title: `Semana ${weekNumber} - Dia ${i + 1}`,
      breakfast_name: breakfasts[i].name,
      breakfast_desc: breakfasts[i].desc,
      lunch_name: lunches[i].name,
      lunch_desc: lunches[i].desc,
      dinner_name: dinners[i].name,
      dinner_desc: dinners[i].desc,
      water_target: hydration.water,
      tea_name: hydration.tea,
      tea_tip: hydration.tip,
      exercise_name: exercise.name,
      exercise_desc: exercise.desc,
      tip_of_day: TIPS[i],
      did_you_know: `Sabia que manter uma rotina alimentar saudavel e o segredo da longevidade?`,
      motivation: `${name}, ${MOTIVATIONS[i].toLowerCase()}`,
    }
  })
}
