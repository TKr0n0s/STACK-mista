'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { EmailLoginForm } from '@/components/email-login-form'

export default function LoginPage() {
  const [showLogin, setShowLogin] = useState(false)

  return (
    <Card>
      <CardHeader className="space-y-3 text-center">
        <img src="/icons/icon-192.png" alt="Sempre Magras" className="h-16 w-16 rounded-full" />
        <CardTitle className="text-2xl text-primary">
          Sempre Magras
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Programa de emagrecimento e saúde
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {!showLogin ? (
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
              onClick={() => setShowLogin(true)}
            >
              Entrar na minha conta
            </Button>
          </>
        ) : (
          <div className="space-y-4">
            <EmailLoginForm
              title=""
              subtitle="Digite seu email para entrar"
              buttonText="Entrar"
            />
            <Button
              variant="ghost"
              className="w-full text-sm"
              onClick={() => setShowLogin(false)}
            >
              Voltar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
