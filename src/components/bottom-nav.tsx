'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Star, BarChart3, Menu } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { id: 'dashboard', label: 'Meu Dia', icon: Home, href: '/dashboard' },
  { id: 'plan', label: 'Plano', icon: Star, href: '/plan' },
  { id: 'progress', label: 'Progresso', icon: BarChart3, href: '/progress' },
  { id: 'settings', label: 'Mais', icon: Menu, href: '/settings' },
] as const

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 px-4 safe-bottom">
      <div className="floating-nav mx-auto flex max-w-[600px] items-center justify-evenly py-3 px-6">
        {tabs.map((tab) => {
          const isActive =
            pathname === tab.href || pathname.startsWith(tab.href + '/')
          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={cn(
                'relative flex flex-col items-center justify-center gap-1 px-3 py-1 text-xs transition-all duration-200',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <tab.icon
                className={cn(
                  'transition-transform duration-200',
                  isActive ? 'h-[22px] w-[22px]' : 'h-5 w-5'
                )}
                strokeWidth={isActive ? 2.5 : 1.8}
              />
              <span className={cn(
                'text-[11px] leading-none transition-all',
                isActive ? 'font-bold text-primary' : 'font-medium text-muted-foreground'
              )}>
                {tab.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
