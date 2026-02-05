import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function PrivacidadePage() {
  return (
    <Card className="max-h-[90vh] overflow-y-auto">
      <CardHeader>
        <CardTitle className="text-xl">Política de Privacidade</CardTitle>
        <p className="text-xs text-muted-foreground">
          Última atualização: Fevereiro 2026
        </p>
      </CardHeader>
      <CardContent className="prose prose-sm max-w-none space-y-4 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h3 className="text-base font-semibold text-foreground">
            1. Dados Coletados
          </h3>
          <p>
            Coletamos apenas os dados necessários para o funcionamento do app:
            nome, email, idade, peso, restrições alimentares e dados de
            progresso (jejum, água, refeições). Estes são considerados dados
            sensíveis de saúde conforme Art. 11 da LGPD.
          </p>
        </section>

        <section>
          <h3 className="text-base font-semibold text-foreground">
            2. Uso dos Dados
          </h3>
          <p>
            Seus dados são usados exclusivamente para personalizar seu plano de
            jejum intermitente e acompanhar seu progresso. Utilizamos
            inteligência artificial (Google Gemini) para gerar planos
            personalizados. Seus dados de perfil (nome, idade, preferências
            alimentares) são enviados ao Google Gemini para gerar seu plano
            personalizado. Os dados não são armazenados pelo Google após a
            geração do plano.
          </p>
        </section>

        <section>
          <h3 className="text-base font-semibold text-foreground">
            3. Armazenamento
          </h3>
          <p>
            Seus dados são armazenados de forma segura no Supabase (PostgreSQL
            com criptografia em repouso). Dados locais são armazenados no
            IndexedDB do seu dispositivo para funcionamento offline.
          </p>
        </section>

        <section>
          <h3 className="text-base font-semibold text-foreground">
            4. Compartilhamento
          </h3>
          <p>
            NÃO compartilhamos seus dados com terceiros para fins de marketing
            ou publicidade. Dados são compartilhados apenas com provedores de
            infraestrutura (Supabase, Vercel, Sentry) estritamente necessários
            para o funcionamento do serviço.
          </p>
        </section>

        <section>
          <h3 className="text-base font-semibold text-foreground">
            5. Seus Direitos (LGPD)
          </h3>
          <p>Você tem direito a:</p>
          <ul className="list-disc space-y-1 pl-4">
            <li>Acessar todos os seus dados pessoais</li>
            <li>Exportar seus dados em formato legível</li>
            <li>Corrigir dados incorretos</li>
            <li>Solicitar exclusão completa da sua conta e dados</li>
            <li>Revogar consentimento a qualquer momento</li>
          </ul>
          <p>
            Todas essas opções estão disponíveis em Configurações &gt; dentro do
            app.
          </p>
        </section>

        <section>
          <h3 className="text-base font-semibold text-foreground">
            6. Segurança
          </h3>
          <p>
            Utilizamos criptografia em trânsito (HTTPS/TLS) e em repouso. Acesso
            aos dados é protegido por Row Level Security (RLS), garantindo que
            cada usuário acessa apenas seus próprios dados. Senhas e códigos OTP
            são armazenados com hash bcrypt.
          </p>
        </section>

        <section>
          <h3 className="text-base font-semibold text-foreground">
            7. Cookies e Rastreamento
          </h3>
          <p>
            Utilizamos cookies apenas para autenticação (sessão do usuário). Não
            utilizamos cookies de rastreamento de terceiros. Utilizamos Sentry
            para monitoramento de erros com dados pessoais anonimizados.
          </p>
        </section>

        <section>
          <h3 className="text-base font-semibold text-foreground">
            8. Aviso sobre Saúde
          </h3>
          <p>
            Este aplicativo é educacional e informativo. NÃO substitui
            acompanhamento médico ou nutricional profissional. Consulte um
            profissional de saúde antes de iniciar qualquer programa de jejum.
          </p>
        </section>

        <section>
          <h3 className="text-base font-semibold text-foreground">
            9. Contato
          </h3>
          <p>
            Para exercer seus direitos ou tirar dúvidas sobre privacidade, entre
            em contato pelo email informado na página de compra.
          </p>
        </section>
      </CardContent>
    </Card>
  )
}
