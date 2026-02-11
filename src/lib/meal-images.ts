/**
 * Maps AI-generated meal names to existing meal photos by keyword matching.
 * Falls back to a sensible default per meal type.
 */

const MEAL_IMAGE_MAP: [string, string][] = [
  // Chicken
  ['frango grelhado', 'chicken-sweet-potato.jpg'],
  ['frango desfiado', 'chicken-wrap.jpg'],
  ['frango', 'chicken-salad.jpg'],
  // Fish
  ['salmao', 'baked-fish-veggies.jpg'],
  ['tilapia', 'baked-fish-veggies.jpg'],
  ['peixe', 'baked-fish-veggies.jpg'],
  ['atum', 'tuna-grain-salad.jpg'],
  ['sardinha', 'baked-fish-veggies.jpg'],
  ['camarao', 'baked-fish-veggies.jpg'],
  // Meat
  ['carne', 'beef-puree.jpg'],
  ['picanha', 'beef-puree.jpg'],
  ['file mignon', 'beef-puree.jpg'],
  ['patinho', 'beef-puree.jpg'],
  // Eggs
  ['omelete', 'spinach-omelette.jpg'],
  ['ovo', 'egg-salad.jpg'],
  // Grains & Legumes
  ['quinoa', 'quinoa-bowl.jpg'],
  ['lentilha', 'quinoa-bowl.jpg'],
  ['grao de bico', 'quinoa-bowl.jpg'],
  ['grao-de-bico', 'quinoa-bowl.jpg'],
  ['tofu', 'quinoa-bowl.jpg'],
  // Brazilian staples
  ['arroz', 'rice-beans.jpg'],
  ['feijao', 'rice-beans.jpg'],
  ['feijoada', 'light-feijoada.jpg'],
  ['macarrao', 'pasta-chicken.jpg'],
  ['massa', 'pasta-chicken.jpg'],
  ['tapioca', 'tapioca-cheese.jpg'],
  // Breakfast items
  ['panqueca', 'banana-pancake.jpg'],
  ['crepioca', 'banana-pancake.jpg'],
  ['iogurte', 'yogurt-granola.jpg'],
  ['granola', 'yogurt-granola.jpg'],
  ['vitamina', 'banana-smoothie.jpg'],
  ['smoothie', 'banana-smoothie.jpg'],
  ['abacate', 'avocado-toast.jpg'],
  ['torrada', 'avocado-toast.jpg'],
  // Soups
  ['sopa', 'creamy-veggie-soup.jpg'],
  ['creme', 'pumpkin-cream.jpg'],
  ['caldo', 'creamy-veggie-soup.jpg'],
  // Beverages
  ['cha', 'green-tea-fruit.jpg'],
  // Salads
  ['salada', 'chicken-salad.jpg'],
  // Wraps
  ['wrap', 'chicken-wrap.jpg'],
  ['sanduiche', 'chicken-wrap.jpg'],
  // Pure
  ['pure', 'beef-puree.jpg'],
]

const DEFAULTS: Record<string, string> = {
  breakfast: 'yogurt-granola.jpg',
  lunch: 'rice-beans.jpg',
  dinner: 'creamy-veggie-soup.jpg',
}

function normalize(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

export function getMealImage(mealName: string, type: 'breakfast' | 'lunch' | 'dinner'): string {
  const n = normalize(mealName)
  for (const [keyword, image] of MEAL_IMAGE_MAP) {
    if (n.includes(keyword)) return image
  }
  return DEFAULTS[type] || 'yogurt-granola.jpg'
}
