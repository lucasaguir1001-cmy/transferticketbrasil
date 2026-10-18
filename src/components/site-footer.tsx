import logoTTB from "@/assets/logo-transferticket.png.asset.json";
import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-primary text-primary-foreground">
      <div className="container mx-auto grid gap-8 px-4 py-12 md:grid-cols-4">
        <div>
          <div className="flex items-center">
            <img
              src={logoTTB.url}
              alt="Transfer Ticket Brasil"
              className="h-10 w-auto object-contain rounded-md"
              loading="lazy"
            />
          </div>
          <p className="mt-3 max-w-xs text-sm text-primary-foreground/70">
            A plataforma completa para descobrir, comprar e vender ingressos no Brasil.
          </p>
        </div>
        <FooterCol
          title="Para você"
          items={[
            { label: "Eventos", to: "/eventos" },
            { label: "Categorias", to: "/eventos", hash: "categorias" },
            { label: "Central de ajuda", to: "/central-de-ajuda" },
          ]}
        />
        <FooterCol
          title="Para vendedores"
          items={[
            { label: "Anunciar", to: "/painel/eventos/novo" },
            { label: "Painel", to: "/painel" },
            { label: "Preços e taxas", to: "#" },
          ]}
        />
        <FooterCol
          title="Empresa"
          items={[
            { label: "Sobre nós", to: "/sobre-nos" },
            {
              label: "Suporte",
              to: "https://wa.me/5511940452026?text=Ol%C3%A1%2C%20Transfer%20Ticket%20Brasil",
              external: true,
            },
          ]}
        />
      </div>
      <div className="border-t border-primary-foreground/10 py-6">
        <div className="container mx-auto flex flex-col items-center justify-between gap-2 px-4 text-xs text-primary-foreground/60 md:flex-row">
          <p>© 2026 TTB — Todos os direitos reservados.</p>
          <div className="flex gap-4">
            <Link to="/politica-de-troca-e-transferencia" className="hover:text-primary-foreground transition-colors">Trocas e Transferências</Link>
            <Link to="/politica-de-privacidade" className="hover:text-primary-foreground transition-colors">Privacidade</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

type FooterItem = { label: string; to: string; hash?: string; external?: boolean };

function FooterCol({ title, items }: { title: string; items: FooterItem[] }) {
  return (
    <div>
      <h4 className="font-display text-sm font-semibold">{title}</h4>
      <ul className="mt-3 space-y-2 text-sm text-primary-foreground/70">
        {items.map((i) => (
          <li key={i.label}>
            {i.external ? (
              <a
                href={i.to}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  e.preventDefault();
                  const base = i.to.replace("https://wa.me/", "");
                  const [phone, ...rest] = base.split("?");
                  const params = rest.join("?");
                  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
                  const url = isMobile
                    ? `whatsapp://send?phone=${phone}${params ? "&" + params : ""}`
                    : `https://web.whatsapp.com/send?phone=${phone}${params ? "&" + params : ""}`;
                  window.open(url, "_blank", "noopener,noreferrer");
                }}
                className="transition-colors hover:text-primary-foreground"
              >
                {i.label}
              </a>
            ) : (
              <Link
                to={i.to}
                hash={i.hash}
                className="transition-colors hover:text-primary-foreground"
              >
                {i.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

