export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <div className="max-w-[400px] space-y-4 text-center">
        <div className="text-6xl">📡</div>
        <h1 className="text-2xl font-bold">Sem conexao</h1>
        <p className="text-muted-foreground">
          Voce esta offline. Algumas funcionalidades como o timer de jejum e o
          tracker de agua continuam funcionando normalmente.
        </p>
        <p className="text-sm text-muted-foreground">
          Conecte-se a internet para sincronizar seu progresso e acessar novos
          conteudos.
        </p>
      </div>
    </div>
  )
}
