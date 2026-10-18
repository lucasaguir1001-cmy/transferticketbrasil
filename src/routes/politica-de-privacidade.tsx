import { createFileRoute } from '@tanstack/react-router';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';

export const Route = createFileRoute('/politica-de-privacidade')({
  head: () => ({
    meta: [
      { property: "og:title", content: "Política de Privacidade — Transfer Ticket Brasil" },
      { property: "og:description", content: "Proteção de dados e privacidade na Transfer Ticket Brasil." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },

      { title: 'Política de Privacidade — TTB' },
      { name: 'description', content: 'Nossa política de privacidade e proteção de dados.' },
    ],
  }),
  component: PrivacyPolicy,
});

function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="container mx-auto max-w-4xl px-4 py-16">
        <h1 className="mb-8 font-display text-4xl font-bold">Política de Privacidade</h1>
        <div className="prose prose-slate max-w-none dark:prose-invert">
          <p className="mb-4">
            A sua privacidade é importante para nós. É política do TTB respeitar a sua privacidade em relação a qualquer informação sua que possamos coletar no site TTB.
          </p>
          
          <h2 className="mb-4 mt-8 text-2xl font-semibold">1. Coleta de Informações</h2>
          <p className="mb-4">
            Solicitamos informações pessoais apenas quando realmente precisamos delas para lhe fornecer um serviço. Fazemo-lo por meios justos e legais, com o seu conhecimento e consentimento. Também informamos por que estamos coletando e como será usado.
          </p>

          <h2 className="mb-4 mt-8 text-2xl font-semibold">2. Uso de Dados</h2>
          <p className="mb-4">
            Apenas retemos as informações coletadas pelo tempo necessário para fornecer o serviço solicitado. Quando armazenamos dados, os protegemos dentro de meios comercialmente aceitáveis ​​para evitar perdas e roubos, bem como acesso, divulgação, cópia, uso ou modificação não autorizados.
          </p>

          <h2 className="mb-4 mt-8 text-2xl font-semibold">3. Compartilhamento com Terceiros</h2>
          <p className="mb-4">
            Não compartilhamos informações de identificação pessoal publicamente ou com terceiros, exceto quando exigido por lei ou para a prestação do serviço contratado (como processadores de pagamento e organizadores de eventos).
          </p>

          <h2 className="mb-4 mt-8 text-2xl font-semibold">4. Cookies</h2>
          <p className="mb-4">
            Utilizamos cookies para melhorar sua experiência em nosso site. Você pode optar por desativar os cookies nas configurações do seu navegador, mas isso pode afetar a funcionalidade de certas partes do site.
          </p>

          <h2 className="mb-4 mt-8 text-2xl font-semibold">5. Responsabilidades do Usuário</h2>
          <p className="mb-4">
            O usuário é responsável por manter a confidencialidade de sua senha e conta, e é totalmente responsável por todas as atividades que ocorrem sob sua senha ou conta.
          </p>

          <h2 className="mb-4 mt-8 text-2xl font-semibold">6. Contato</h2>
          <p className="mb-4">
            Se você tiver alguma dúvida sobre como lidamos com dados do usuário e informações pessoais, entre em contato conosco.
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
