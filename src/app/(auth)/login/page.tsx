'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

type View = 'main' | 'magic_link' | 'magic_link_sent' | 'password'

export default function LoginPage() {
  const [view, setView] = useState<View>('main')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleMagicLinkRequest() {
    if (!email) {
      setError('Digite seu email')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao enviar link')
      }

      setView('magic_link_sent')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado')
    } finally {
      setLoading(false)
    }
  }

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError('Email ou senha incorretos')
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <Card>
      <CardHeader className="space-y-3 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <span className="text-3xl" role="img" aria-label="fogo">
            🔥
          </span>
        </div>
        <CardTitle className="text-2xl text-primary">
          Queima Intermitente
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Seu guia de jejum intermitente 16:8 para a menopausa
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {view === 'main' && (
          <>
            <Button asChild className="w-full" size="lg">
              <Link href="/ativar">Ativar Minha Conta</Link>
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Comprou seu acesso? Clique acima para ativar com o email da compra.
            </p>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">já tem conta?</span>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => setView('magic_link')}
            >
              Entrar na minha conta
            </Button>
          </>
        )}

        {view === 'magic_link' && (
          <div className="space-y-4">
            <p className="text-center text-sm text-muted-foreground">
              Digite seu email para receber um link de acesso
            </p>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="h-12"
              />
            </div>
            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}
            <Button
              className="w-full"
              size="lg"
              onClick={handleMagicLinkRequest}
              disabled={!email || loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Enviar link de acesso'
              )}
            </Button>
            <Button
              variant="ghost"
              className="w-full text-sm"
              onClick={() => {
                setView('main')
                setError('')
              }}
            >
              Voltar
            </Button>
          </div>
        )}

        {view === 'magic_link_sent' && (
          <div className="text-center space-y-4 py-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <span className="text-3xl">✉️</span>
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              Link enviado!
            </h3>
            <p className="text-sm text-muted-foreground">
              Enviamos um link de acesso para <strong>{email}</strong>
            </p>
            <p className="text-xs text-muted-foreground">
              Verifique sua caixa de entrada e spam. O link expira em 1 hora.
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setView('main')
                setEmail('')
                setError('')
              }}
            >
              Voltar ao início
            </Button>
          </div>
        )}

        {view === 'password' && (
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="Sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => {
                setView('main')
                setError('')
              }}
            >
              Voltar
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
