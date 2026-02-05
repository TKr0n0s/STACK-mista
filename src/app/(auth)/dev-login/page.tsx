'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'

export default function DevLoginPage() {
  const [status, setStatus] = useState<string>('Pronto para login de teste')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleDevLogin() {
    setLoading(true)
    setStatus('Criando usuario de teste...')

    try {
      // 1. Seed user via API
      const res = await fetch('/api/dev/seed-login', { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        setStatus(`Erro: ${data.error} - ${data.details || ''}`)
        setLoading(false)
        return
      }

      setStatus('Usuario criado. Fazendo login...')

      // 2. Sign in with email/password
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      if (signInError) {
        setStatus(`Erro ao logar: ${signInError.message}`)
        setLoading(false)
        return
      }

      setStatus('Logado! Redirecionando...')
      router.push('/dashboard')
    } catch (err) {
      setStatus(`Erro: ${String(err)}`)
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-sm space-y-4 rounded-2xl bg-card p-6 shadow-sm text-center">
        <h1 className="text-xl font-bold text-foreground">Dev Login</h1>
        <p className="text-sm text-muted-foreground">{status}</p>
        <button
          onClick={handleDevLogin}
          disabled={loading}
          className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {loading ? 'Aguarde...' : 'Login de Teste'}
        </button>
        <p className="text-xs text-muted-foreground">
          admin@queimaintermitente.com / admin123
        </p>
      </div>
    </div>
  )
}
