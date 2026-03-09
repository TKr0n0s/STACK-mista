'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'

interface EmailLoginFormProps {
  title?: string
  subtitle?: string
  buttonText?: string
  onSuccess?: () => void
}

export function EmailLoginForm({
  title = 'Entrar',
  subtitle = 'Digite o email da sua compra',
  buttonText = 'Entrar',
  onSuccess,
}: EmailLoginFormProps) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/email-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao entrar')
      }

      // Session is now set via httpOnly cookies server-side
      // Just redirect
      if (onSuccess) {
        onSuccess()
      } else {
        window.location.href = data.redirect_to || '/dashboard'
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {title && (
        <div className="text-center space-y-1">
          <h2 className="text-xl font-semibold text-foreground">{title}</h2>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com"
          disabled={loading}
          className="h-12 text-base"
          autoFocus
          autoComplete="email"
        />
      </div>

      {error && (
        <p className="text-center text-sm text-destructive">{error}</p>
      )}

      <Button
        type="submit"
        disabled={!email.trim() || loading}
        className="w-full"
        size="lg"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Entrando...
          </>
        ) : (
          buttonText
        )}
      </Button>
    </form>
  )
}
