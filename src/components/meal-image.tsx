'use client'

import { useState } from 'react'
import Image from 'next/image'

interface MealImageProps {
  src: string
  alt: string
  fill?: boolean
  width?: number
  height?: number
  sizes?: string
  className?: string
  mealType?: 'breakfast' | 'lunch' | 'dinner' | string
  priority?: boolean
}

const mealGradients: Record<string, { gradient: string; accent: string }> = {
  breakfast: {
    gradient: 'linear-gradient(145deg, #FBBF24 0%, #F59E0B 40%, #EA580C 100%)',
    accent: '#FDE68A',
  },
  lunch: {
    gradient: 'linear-gradient(145deg, #34D399 0%, #10B981 40%, #047857 100%)',
    accent: '#A7F3D0',
  },
  dinner: {
    gradient: 'linear-gradient(145deg, #818CF8 0%, #6366F1 40%, #312E81 100%)',
    accent: '#C7D2FE',
  },
  default: {
    gradient: 'linear-gradient(145deg, #F9A8D4 0%, #D85C7B 40%, #BE185D 100%)',
    accent: '#FBCFE8',
  },
}

const foodEmojis: Record<string, string> = {
  'chicken-salad': '\u{1F957}',
  'green-tea-fruit': '\u{1F375}',
  'veggie-soup-fish': '\u{1F372}',
  'spinach-omelette': '\u{1F373}',
  'quinoa-bowl': '\u{1F963}',
  'chicken-sweet-potato': '\u{1F357}',
  'yogurt-granola': '\u{1F95B}',
  'tuna-grain-salad': '\u{1F41F}',
  'pumpkin-cream': '\u{1F383}',
  'tapioca-cheese': '\u{1F9C0}',
  'rice-beans': '\u{1F35A}',
  'egg-salad': '\u{1F95A}',
  'banana-smoothie': '\u{1F34C}',
  'pasta-chicken': '\u{1F35D}',
  'baked-fish-veggies': '\u{1F420}',
  'avocado-toast': '\u{1F951}',
  'beef-puree': '\u{1F969}',
  'chicken-wrap': '\u{1F32F}',
  'banana-pancake': '\u{1F95E}',
  'light-feijoada': '\u{1FAD8}',
  'creamy-veggie-soup': '\u{1F966}',
}

function getFoodEmoji(src: string): string {
  const filename = src.split('/').pop()?.replace(/\.(webp|jpe?g|png)$/i, '') || ''
  return foodEmojis[filename] || '\u{1F37D}\u{FE0F}'
}

export function MealImage({ src, alt, fill, width, height, sizes, className = '', mealType = 'default', priority = false }: MealImageProps) {
  const [imgError, setImgError] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)
  const config = mealGradients[mealType] || mealGradients.default
  const emoji = getFoodEmoji(src)

  // Try loading real photo first
  if (!imgError) {
    return (
      <div
        className={`relative overflow-hidden ${className}`}
        style={{
          background: config.gradient,
          ...(fill ? { position: 'absolute' as const, inset: 0 } : { width, height }),
        }}
        aria-label={alt}
      >
        <Image
          src={src}
          alt={alt}
          fill={fill}
          width={!fill ? (width ?? 200) : undefined}
          height={!fill ? (height ?? 200) : undefined}
          sizes={sizes}
          priority={priority}
          className={`object-cover transition-opacity duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={(e) => {
            // Check if the loaded image is a real photo (not a tiny placeholder)
            const img = e.currentTarget as HTMLImageElement
            if (img.naturalWidth < 20 || img.naturalHeight < 20) {
              setImgError(true)
            } else {
              setImgLoaded(true)
            }
          }}
          onError={() => setImgError(true)}
        />
        {/* No overlay on thumbnails — keep photos crisp */}
        {/* Show emoji while loading */}
        {!imgLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-3xl opacity-60" role="img">{emoji}</span>
          </div>
        )}
      </div>
    )
  }

  // Fallback: gradient + emoji
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden ${className}`}
      style={{
        background: config.gradient,
        ...(fill ? { position: 'absolute' as const, inset: 0 } : { width, height }),
      }}
      aria-label={alt}
    >
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at 50% 45%, ${config.accent}30 0%, transparent 55%)`,
        }}
      />
      <div className="relative flex items-center justify-center">
        <div
          className="absolute h-16 w-16 rounded-full blur-xl"
          style={{ background: `${config.accent}25` }}
        />
        <span className="relative text-5xl drop-shadow-lg" role="img">{emoji}</span>
      </div>
    </div>
  )
}
