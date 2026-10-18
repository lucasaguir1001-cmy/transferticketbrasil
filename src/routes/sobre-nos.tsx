import { createFileRoute } from '@tanstack/react-router';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';

export const Route = createFileRoute('/sobre-nos')({
  head: () => ({
    meta: [
      { title: 'Sobre nós — TTB' },
      { name: 'description', content: 'Conheça a Transfer Ticket Brasil e nossa missão de tornar a compra e venda de ingressos simples, segura e transparente.' },
      { property: 'og:title', content: 'Sobre nós — TTB' },
      { property: 'og:description', content: 'Conheça a Transfer Ticket Brasil e nossa missão de tornar a compra e venda de ingressos simples, segura e transparente.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="container mx-auto max-w-4xl px-4 py-16">
        <h1 className="mb-8 font-display text-4xl font-bold">Sobre nós</h1>
        <div className="prose prose-slate max-w-none dark:prose-invert">
          <p className="mb-4">
            Na Transferticket Brasil, acreditamos que comprar e vender ingressos deve ser uma experiência simples, segura e transparente. Nossa plataforma nasceu para transformar a forma como os fãs acessam shows, festivais, jogos e eventos culturais em todo o país, oferecendo uma solução prática para quem precisa transferir ou revender ingressos de maneira confiável.
          </p>

          <p className="mb-4">
            <strong>Segurança em primeiro lugar:</strong> garantimos que cada transação seja protegida, evitando fraudes e assegurando que o ingresso chegue corretamente ao novo titular.
          </p>

          <p className="mb-4">
            <strong>Facilidade de uso:</strong> com poucos cliques, você pode transferir ou revender seu ingresso, sem burocracia e com total controle sobre o processo.
          </p>

          <p className="mb-4">
            <strong>Conexão entre pessoas:</strong> aproximamos quem tem ingressos disponíveis de quem busca oportunidades, criando uma comunidade de confiança e conveniência.
          </p>

          <p className="mb-4">
            <strong>Compromisso com a transparência:</strong> todas as etapas são claras e acompanhadas pelo usuário, garantindo tranquilidade em cada operação.
          </p>

          <p className="mb-4">
            Nosso objetivo é democratizar o acesso a eventos, permitindo que ninguém perca a chance de viver experiências inesquecíveis por causa de imprevistos. Seja para transferir a titularidade de um ingresso ou encontrar novas oportunidades, estamos aqui para tornar sua jornada mais prática e segura.
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
