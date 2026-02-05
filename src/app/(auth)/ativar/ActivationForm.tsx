'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'

type Step = 'checking' | 'email' | 'otp'

export function ActivationForm() {
  const searchParams = useSearchParams()
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState(searchParams.get('email') || '')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  // Auto-poll if email is in URL (redirected from Hotmart)
  useEffect(() => {
    const urlEmail = searchParams.get('email')
    if (urlEmail) {
      setEmail(urlEmail)
      setStep('checking')
      startPolling(urlEmail)
    }
    return stopPolling
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function startPolling(pollEmail: string) {
    let attempts = 0
    let consecutiveErrors = 0
    const maxAttempts = 15 // 30 seconds at 2s intervals

    pollRef.current = setInterval(async () => {
      attempts++
      if (attempts > maxAttempts) {
        stopPolling()
        setStep('email')
        setError(
          'Compra ainda não confirmada. Tente novamente em alguns minutos.'
        )
        return
      }

      try {
        const res = await fetch(
          `/api/activation/status?email=${encodeURIComponent(pollEmail)}`
        )
        const data = await res.json()

        if (data.status === 'ready') {
          stopPolling()
          await requestOTP(pollEmail)
        } else if (data.status === 'activated') {
          stopPolling()
          window.location.href = '/dashboard'
        }

        // Reset error counter on successful fetch
        consecutiveErrors = 0
      } catch {
        consecutiveErrors++
        if (consecutiveErrors >= 3) {
          stopPolling()
          setError('Erro de conexão. Verifique sua internet e tente novamente.')
          return
        }
      }
    }, 2000)
  }

  async function requestOTP(otpEmail: string) {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/activation/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: otpEmail }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao enviar código')
      setStep('otp')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado')
      setStep('email')
    } finally {
      setLoading(false)
    }
  }

  async function handleRequestOTP() {
    stopPolling()
    await requestOTP(email)
  }

  async function handleVerifyOTP() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/activation/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Código inválido')

      // Client-side: create session with hashed_token
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { error: verifyError } = await supabase.auth.verifyOtp({
        type: 'magiclink',
        token_hash: data.hashed_token,
        email,
      })
      if (verifyError) throw verifyError

      window.location.href = '/onboarding'
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'checking') {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-center text-sm text-muted-foreground">
          Verificando sua compra...
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {step === 'email' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="email">Email da compra</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              disabled={loading}
              className="h-12 text-base"
            />
          </div>
          <Button
            onClick={handleRequestOTP}
            disabled={!email || loading}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              'Enviar código de ativação'
            )}
          </Button>
        </>
      )}

      {step === 'otp' && (
        <>
          <p className="text-center text-sm text-muted-foreground">
            Enviamos um código de 6 dígitos para <strong>{email}</strong>
          </p>
          <div className="space-y-2">
            <Label htmlFor="otp">Código de ativação</Label>
            <Input
              id="otp"
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              disabled={loading}
              className="h-14 text-center text-2xl tracking-widest"
              autoFocus
            />
          </div>
          <Button
            onClick={handleVerifyOTP}
            disabled={otp.length !== 6 || loading}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verificando...
              </>
            ) : (
              'Ativar Conta'
            )}
          </Button>
          <button
            onClick={() => {
              setStep('email')
              setOtp('')
              setError('')
            }}
            className="w-full text-center text-sm text-muted-foreground underline"
          >
            Usar outro email
          </button>
        </>
      )}

      {error && (
        <p className="text-center text-sm text-destructive">{error}</p>
      )}
    </div>
  )
}
