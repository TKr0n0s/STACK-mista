'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'

// Singleton: one client, one fetch
let cachedUserId: string | null = null
let fetchPromise: Promise<string> | null = null

function fetchUserId(): Promise<string> {
  if (cachedUserId) return Promise.resolve(cachedUserId)
  if (fetchPromise) return fetchPromise

  fetchPromise = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
    .auth.getUser()
    .then(({ data: { user } }) => {
      cachedUserId = user?.id || 'anonymous'
      return cachedUserId
    })
    .catch(() => {
      cachedUserId = 'anonymous'
      return 'anonymous'
    })

  return fetchPromise
}

// Reset on logout
export function resetUserIdCache() {
  cachedUserId = null
  fetchPromise = null
}

export function useUserId(): { userId: string; isLoading: boolean } {
  const [userId, setUserId] = useState<string>(cachedUserId || 'anonymous')
  const [isLoading, setIsLoading] = useState(!cachedUserId)

  useEffect(() => {
    if (cachedUserId) {
      setUserId(cachedUserId)
      setIsLoading(false)
      return
    }

    fetchUserId().then((id) => {
      setUserId(id)
      setIsLoading(false)
    })
  }, [])

  return { userId, isLoading }
}
