import { createFileRoute, Link, Outlet, redirect, useLocation } from "@tanstack/react-router";
import { LayoutDashboard, CalendarPlus, Ticket } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";


export const Route = createFileRoute("/_authenticated/painel")({
  head: () => ({
    meta: [
      { name: "description", content: "Gestão dos anúncios do vendedor na Transfer Ticket Brasil." },
      { property: "og:title", content: "Área do vendedor — Transfer Ticket Brasil" },
      { property: "og:description", content: "Gestão dos anúncios do vendedor na Transfer Ticket Brasil." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },

      { title: "Painel do organizador — TTB" },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: ({ context, location }) => {
    if (typeof window === "undefined") return;
    const user = (context as { user?: { id: string } }).user;
    if (!user) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
  },

  component: PainelLayout,
});

function PainelLayout() {
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      {/* Removido o cabeçalho duplicado do painel conforme solicitado */}
      <section className="container mx-auto px-4 py-10">
        {/* Removida a barra lateral com o botão Anunciar conforme solicitado */}
        <div>
          <Outlet />
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}

function NavItem({
  to,
  active,
  icon,
  children,
}: {
  to: string;
  active: boolean;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className={
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors " +
        (active
          ? "bg-gradient-brand text-brand-foreground shadow-glow"
          : "text-muted-foreground hover:bg-muted hover:text-foreground")
      }
    >
      {icon}
      {children}
    </Link>
  );
}
