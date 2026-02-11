#!/usr/bin/env node

/**
 * One-time script to pre-download ~80 food images from Pexels.
 * Downloads to public/meals/pexels/{slug}.jpg and generates
 * src/data/pexels-image-map.json for meal-images.ts.
 *
 * Usage: PEXELS_API_KEY=xxx node scripts/download-pexels-images.mjs
 * Or: reads from .env.local automatically.
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

// Load .env.local if PEXELS_API_KEY not in env
if (!process.env.PEXELS_API_KEY) {
  const envPath = path.join(ROOT, '.env.local')
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8')
    for (const line of envContent.split('\n')) {
      const match = line.match(/^PEXELS_API_KEY=(.+)$/)
      if (match) {
        process.env.PEXELS_API_KEY = match[1].trim()
        break
      }
    }
  }
}

const API_KEY = process.env.PEXELS_API_KEY
if (!API_KEY) {
  console.error('PEXELS_API_KEY not found. Set it in env or .env.local')
  process.exit(1)
}

const OUTPUT_DIR = path.join(ROOT, 'public', 'meals', 'pexels')
const MAP_FILE = path.join(ROOT, 'src', 'data', 'pexels-image-map.json')

// Brazilian food terms → English search queries (Pexels works better in EN)
const TERMS = [
  // Proteins - Chicken
  { pt: 'frango grelhado', en: 'grilled chicken breast plate' },
  { pt: 'peito de frango', en: 'grilled chicken breast herbs' },
  { pt: 'frango desfiado', en: 'shredded chicken dish' },
  { pt: 'frango ao forno', en: 'roasted chicken vegetables' },
  { pt: 'sobrecoxa', en: 'chicken thigh roasted plate' },
  { pt: 'strogonoff de frango', en: 'chicken stroganoff rice' },
  { pt: 'escondidinho de frango', en: 'chicken casserole mashed' },

  // Proteins - Fish & Seafood
  { pt: 'salmao grelhado', en: 'grilled salmon plate vegetables' },
  { pt: 'salmao', en: 'salmon fillet plate' },
  { pt: 'tilapia', en: 'grilled tilapia fish plate' },
  { pt: 'tilapia assada', en: 'baked tilapia vegetables' },
  { pt: 'atum', en: 'tuna steak plate' },
  { pt: 'peixe assado', en: 'baked fish vegetables plate' },
  { pt: 'peixe grelhado', en: 'grilled white fish plate' },
  { pt: 'sardinha', en: 'grilled sardines plate' },
  { pt: 'bacalhau', en: 'codfish traditional plate' },
  { pt: 'camarao', en: 'grilled shrimp plate' },
  { pt: 'poke bowl', en: 'poke bowl tuna rice' },

  // Proteins - Meat
  { pt: 'picanha', en: 'grilled steak plate salad' },
  { pt: 'carne grelhada', en: 'grilled beef steak vegetables' },
  { pt: 'carne moida', en: 'ground beef dish rice' },
  { pt: 'bife', en: 'beef steak plate salad' },
  { pt: 'carne assada', en: 'roast beef vegetables' },
  { pt: 'hamburguer', en: 'homemade burger lettuce' },

  // Proteins - Eggs
  { pt: 'omelete', en: 'vegetable omelette plate' },
  { pt: 'omelete de espinafre', en: 'spinach omelette herbs' },
  { pt: 'ovos mexidos', en: 'scrambled eggs toast breakfast' },
  { pt: 'ovo cozido', en: 'boiled eggs salad plate' },
  { pt: 'crepioca', en: 'brazilian crepioca tapioca egg' },

  // Proteins - Legumes/Vegan
  { pt: 'tofu', en: 'tofu stir fry vegetables' },
  { pt: 'tofu grelhado', en: 'grilled tofu plate vegetables' },
  { pt: 'grao de bico', en: 'chickpea salad bowl' },
  { pt: 'lentilha', en: 'lentil soup bowl' },
  { pt: 'sopa de lentilha', en: 'lentil vegetable soup' },
  { pt: 'feijao preto', en: 'black beans rice plate' },
  { pt: 'edamame', en: 'edamame bowl' },

  // Breakfast items
  { pt: 'tapioca', en: 'brazilian tapioca cheese' },
  { pt: 'tapioca de frango', en: 'tapioca chicken filling' },
  { pt: 'panqueca de banana', en: 'banana pancakes plate' },
  { pt: 'panqueca', en: 'healthy pancakes fruit' },
  { pt: 'iogurte granola', en: 'yogurt granola berries bowl' },
  { pt: 'iogurte', en: 'yogurt bowl fruit' },
  { pt: 'vitamina', en: 'fruit smoothie glass' },
  { pt: 'smoothie verde', en: 'green smoothie glass' },
  { pt: 'acai', en: 'acai bowl granola banana' },
  { pt: 'mingau de aveia', en: 'oatmeal porridge fruit' },
  { pt: 'aveia', en: 'oatmeal bowl berries' },
  { pt: 'pao integral', en: 'whole wheat bread avocado toast' },
  { pt: 'abacate torrada', en: 'avocado toast plate' },
  { pt: 'frutas', en: 'fresh fruit bowl plate' },
  { pt: 'pasta de amendoim', en: 'peanut butter fruit toast' },

  // Lunch/Dinner - Salads
  { pt: 'salada', en: 'fresh green salad plate' },
  { pt: 'salada caesar', en: 'caesar salad chicken' },
  { pt: 'salada proteica', en: 'protein salad chicken eggs' },
  { pt: 'salada completa', en: 'complete salad mixed vegetables' },

  // Lunch/Dinner - Rice & Beans
  { pt: 'arroz integral', en: 'brown rice plate' },
  { pt: 'arroz feijao', en: 'rice beans brazilian plate' },
  { pt: 'arroz', en: 'steamed rice vegetables' },

  // Lunch/Dinner - Soups
  { pt: 'sopa de legumes', en: 'vegetable soup bowl' },
  { pt: 'sopa de frango', en: 'chicken soup vegetables' },
  { pt: 'creme de abobora', en: 'pumpkin cream soup bowl' },
  { pt: 'caldo verde', en: 'green soup kale' },

  // Lunch/Dinner - Sides & Others
  { pt: 'batata doce', en: 'sweet potato baked plate' },
  { pt: 'quinoa', en: 'quinoa salad bowl' },
  { pt: 'bowl de quinoa', en: 'quinoa vegetable bowl' },
  { pt: 'wrap', en: 'chicken wrap vegetables' },
  { pt: 'quiche', en: 'vegetable quiche slice plate' },
  { pt: 'legumes', en: 'roasted vegetables plate' },
  { pt: 'legumes grelhados', en: 'grilled vegetables plate' },
  { pt: 'brocolis', en: 'steamed broccoli plate' },
  { pt: 'abobrinha', en: 'grilled zucchini plate' },
  { pt: 'abobora', en: 'roasted pumpkin plate' },
  { pt: 'mandioca', en: 'cassava cooked plate' },
  { pt: 'pure de batata', en: 'mashed potato plate' },

  // Snacks & Extras
  { pt: 'cha verde', en: 'green tea cup' },
  { pt: 'cha', en: 'herbal tea cup' },
  { pt: 'agua com limao', en: 'lemon water glass' },
  { pt: 'castanhas', en: 'mixed nuts bowl' },
  { pt: 'granola', en: 'granola bowl' },
  { pt: 'mel', en: 'honey jar natural' },
]

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

async function searchPexels(query) {
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=3&orientation=landscape`
  const res = await fetch(url, {
    headers: { Authorization: API_KEY },
  })
  if (!res.ok) {
    console.error(`  Pexels API error: ${res.status} for query "${query}"`)
    return null
  }
  const data = await res.json()
  // Curate: prefer landscape photos
  const photo = data.photos?.find(p => p.width > p.height) || data.photos?.[0]
  return photo?.src?.medium || null // medium is ~350px height, good quality/size ratio
}

async function downloadImage(url, filepath) {
  const res = await fetch(url)
  if (!res.ok) {
    console.error(`  Download failed: ${res.status} for ${url}`)
    return false
  }
  const buffer = Buffer.from(await res.arrayBuffer())
  fs.writeFileSync(filepath, buffer)
  return true
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function main() {
  // Ensure output directories exist
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  fs.mkdirSync(path.dirname(MAP_FILE), { recursive: true })

  const imageMap = {}
  let downloaded = 0
  let skipped = 0
  let failed = 0

  console.log(`Downloading ${TERMS.length} food images from Pexels...\n`)

  for (let i = 0; i < TERMS.length; i++) {
    const { pt, en } = TERMS[i]
    const slug = slugify(en)
    const filename = `${slug}.jpg`
    const filepath = path.join(OUTPUT_DIR, filename)

    process.stdout.write(`[${i + 1}/${TERMS.length}] "${pt}" → "${en}"... `)

    // Skip if already downloaded
    if (fs.existsSync(filepath)) {
      imageMap[pt] = `pexels/${filename}`
      console.log('CACHED')
      skipped++
      continue
    }

    const imageUrl = await searchPexels(en)
    if (!imageUrl) {
      console.log('NO RESULT')
      failed++
      await sleep(500)
      continue
    }

    const ok = await downloadImage(imageUrl, filepath)
    if (ok) {
      const stats = fs.statSync(filepath)
      const sizeKB = Math.round(stats.size / 1024)
      imageMap[pt] = `pexels/${filename}`
      console.log(`OK (${sizeKB}KB)`)
      downloaded++
    } else {
      console.log('DOWNLOAD FAILED')
      failed++
    }

    // Respect Pexels rate limit (200 req/hour ≈ 1 every 18s, we use 500ms to be safe)
    await sleep(500)
  }

  // Write image map
  fs.writeFileSync(MAP_FILE, JSON.stringify(imageMap, null, 2) + '\n')

  console.log(`\n--- Summary ---`)
  console.log(`Downloaded: ${downloaded}`)
  console.log(`Cached: ${skipped}`)
  console.log(`Failed: ${failed}`)
  console.log(`Total in map: ${Object.keys(imageMap).length}`)
  console.log(`Map: ${MAP_FILE}`)
  console.log(`Images: ${OUTPUT_DIR}`)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
