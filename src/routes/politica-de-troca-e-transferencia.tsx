import { createFileRoute } from '@tanstack/react-router';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';

export const Route = createFileRoute('/politica-de-troca-e-transferencia')({
  head: () => ({
    meta: [
      { property: "og:title", content: "Política de Troca e Transferência — Transfer Ticket Brasil" },
      { property: "og:description", content: "Regras de troca e transferência de ingressos na Transfer Ticket Brasil." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },

      { title: 'Política de Troca e Transferência — TTB' },
      { name: 'description', content: 'Regras para cancelamentos, trocas e transferências de ingressos.' },
    ],
  }),
  component: ExchangePolicy,
});

function ExchangePolicy() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="container mx-auto max-w-4xl px-4 py-16">
        <h1 className="mb-8 font-display text-4xl font-bold">Política de Troca e Transferência</h1>
        <div className="prose prose-slate max-w-none dark:prose-invert">
          <h2 className="mb-4 mt-8 text-2xl font-semibold">1. Arrependimento e Cancelamento</h2>
          <p className="mb-4">
            Em conformidade com o Código de Defesa do Consumidor, o cancelamento de uma compra pode ser solicitado em até 7 (sete) dias corridos após a data da compra, desde que não ultrapasse 48 horas antes do início do evento.
          </p>
          
          <h2 className="mb-4 mt-8 text-2xl font-semibold">2. Troca de TTBs</h2>
          <p className="mb-4">
            Não realizamos a troca de ingressos por outros eventos ou setores diferentes após a finalização da compra. Caso deseje alterar seu ingresso, será necessário solicitar o cancelamento (dentro do prazo legal) e realizar uma nova compra.
          </p>

          <h2 className="mb-4 mt-8 text-2xl font-semibold">3. Transferência de Titularidade</h2>
          <p className="mb-4">
            A transferência de titularidade é permitida uma única vez por ingresso, através do nosso painel de usuário, até 24 horas antes do início do evento. Após esse prazo, ou se o ingresso já tiver sido transferido anteriormente, a titularidade torna-se definitiva.
          </p>

          <h2 className="mb-4 mt-8 text-2xl font-semibold">4. Responsabilidade</h2>
          <p className="mb-4">
            O TTB não se responsabiliza por ingressos adquiridos fora de nossos canais oficiais. A transferência de titularidade realizada de forma externa não garante o acesso ao evento se não for processada através do nosso sistema.
          </p>

          <h2 className="mb-4 mt-8 text-2xl font-semibold">5. Eventos Cancelados ou Adiados</h2>
          <p className="mb-4">
            Em caso de cancelamento do evento por parte do organizador, o reembolso será processado automaticamente conforme as diretrizes estabelecidas pela organização do evento e legislação vigente.
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
