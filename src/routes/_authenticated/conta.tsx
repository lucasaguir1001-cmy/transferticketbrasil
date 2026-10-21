import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Ticket, LogOut, User as UserIcon, Calendar, ChevronRight, ShieldCheck } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/conta")({
  head: () => ({
    meta: [
      { name: "description", content: "Dados da sua conta na Transfer Ticket Brasil." },
      { property: "og:title", content: "Minha conta — Transfer Ticket Brasil" },
      { property: "og:description", content: "Dados da sua conta na Transfer Ticket Brasil." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },

      { title: "Minha conta — TTB" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AccountPage,
});

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
}

function AccountPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState("");
  const [createdAt, setCreatedAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email ?? "");
      setCreatedAt(user.created_at ?? "");
      const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, phone")
        .eq("id", user.id)
        .maybeSingle();

      // Se o perfil ainda não existir (ou vier vazio), usa os dados do cadastro.
      setProfile({
        id: user.id,
        full_name:
          data?.full_name ??
          (typeof meta.full_name === "string" ? meta.full_name : null) ??
          (typeof meta.name === "string" ? meta.name : null),
        avatar_url:
          data?.avatar_url ??
          (typeof meta.avatar_url === "string" ? meta.avatar_url : null),
        phone:
          data?.phone ?? (typeof meta.phone === "string" ? meta.phone : null),
      });

      // Verifica se o usuário possui cargo de admin
      const emailHasAdmin = user.email?.toLowerCase().includes("admin") ?? false;
      if (emailHasAdmin) setIsAdmin(true);

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (roleData) setIsAdmin(true);
    })();
  }, []);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").upsert({
      id: profile.id,
      full_name: profile.full_name,
      phone: profile.phone,
      avatar_url: profile.avatar_url,
    });
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Perfil atualizado");
  };


  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const initials = (profile?.full_name || email || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <section className="border-b border-border bg-secondary/40">
        <div className="container mx-auto flex flex-col items-start gap-4 px-4 py-10 sm:flex-row sm:items-center">
          <div className="bg-gradient-brand grid h-16 w-16 flex-none place-items-center rounded-2xl font-display text-2xl font-bold text-brand-foreground shadow-glow">
            {initials}
          </div>
          <div className="flex-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Bem-vindo(a)
            </p>
            <h1 className="font-display text-3xl font-bold">
              {profile?.full_name || "Sua conta"}
            </h1>
            <p className="text-sm text-muted-foreground">{email}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isAdmin && (
              <Link
                to="/admin"
                className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground shadow-glow transition-all hover:brightness-110"
              >
                <ShieldCheck className="h-4 w-4" />
                Painel Admin
              </Link>
            )}
            <button
              onClick={handleSignOut}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </div>
        </div>
      </section>

      {isAdmin && (
        <section className="border-b border-brand/30 bg-brand/10 py-3">
          <div className="container mx-auto flex flex-wrap items-center justify-between gap-4 px-4">
            <div className="flex items-center gap-2 text-sm font-medium text-brand">
              <ShieldCheck className="h-5 w-5" />
              <span>Você está conectado com privilégios de Administrador.</span>
            </div>
            <Link
              to="/admin"
              className="rounded-full bg-brand px-4 py-1.5 text-xs font-semibold text-brand-foreground shadow-glow transition-all hover:brightness-110"
            >
              Ir para Painel de Administração &rarr;
            </Link>
          </div>
        </section>
      )}

      <section className="container mx-auto grid gap-8 px-4 py-12 lg:grid-cols-[1fr_360px]">
        <div className="space-y-8">
          <div id="meus-ingressos">
            <h2 className="font-display text-2xl font-bold">Meus ingressos</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Apresente o QR Code de cada ingresso na entrada do evento.
            </p>
            <TicketsList />
          </div>

          <div id="historico-de-pedidos">
            <h2 className="font-display text-2xl font-bold">Histórico de pedidos</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Todas as suas compras em um só lugar.
            </p>
            <OrdersList />
          </div>


          <div id="dados-pessoais">
            <h2 className="font-display text-2xl font-bold">Dados pessoais</h2>
            <div className="mt-4 space-y-3 rounded-2xl border border-border bg-card p-6">
              <FieldRow
                label="Nome completo"
                value={profile?.full_name ?? ""}
                onChange={(v) =>
                  setProfile((p) => (p ? { ...p, full_name: v } : p))
                }
              />
              <FieldRow label="Email" value={email} readOnly />
              <FieldRow
                label="Telefone"
                value={profile?.phone ?? ""}
                onChange={(v) => setProfile((p) => (p ? { ...p, phone: v } : p))}
                placeholder="(11) 99999-9999"
              />
              <FieldRow
                label="Membro desde"
                value={
                  createdAt
                    ? new Date(createdAt).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })
                    : ""
                }
                readOnly
              />

              <button
                onClick={handleSave}
                disabled={saving || !profile}
                className="bg-gradient-brand mt-2 rounded-full px-5 py-2.5 text-sm font-semibold text-brand-foreground shadow-glow disabled:opacity-50"
              >
                {saving ? "Salvando..." : "Salvar alterações"}
              </button>
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <QuickLink icon={<UserIcon className="h-4 w-4" />} label="Dados pessoais" href="#dados-pessoais" />
          <QuickLink icon={<Ticket className="h-4 w-4" />} label="Meus ingressos" href="#meus-ingressos" />
          <QuickLink icon={<Calendar className="h-4 w-4" />} label="Histórico de compras" href="#historico-de-pedidos" />
        </aside>
      </section>

      <SiteFooter />
    </div>
  );
}

function FieldRow({
  label,
  value,
  onChange,
  readOnly,
  placeholder,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  readOnly?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        readOnly={readOnly}
        placeholder={placeholder}
        className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-brand read-only:cursor-not-allowed read-only:text-muted-foreground"
      />
    </label>
  );
}

function QuickLink({
  icon,
  label,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 text-sm transition-colors hover:border-brand"
    >
      <div className="bg-gradient-brand grid h-8 w-8 place-items-center rounded-lg text-brand-foreground">
        {icon}
      </div>
      <span className="font-medium">{label}</span>
    </a>
  );
}

interface OrderSummary {
  id: string;
  total_cents: number;
  status: string;
  created_at: string;
  tickets: Array<{
    id: string;
    code: string;
    event: { title: string; slug: string; starts_at: string; city: string | null };
  }>;
}

function OrdersList() {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("orders")
        .select(
          "id, total_cents, status, created_at, tickets ( id, code, event:events ( title, slug, starts_at, city ) )",
        )
        .order("created_at", { ascending: false });
      setOrders((data as unknown as OrderSummary[]) ?? []);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return <div className="mt-4 h-24 animate-pulse rounded-2xl bg-muted/40" />;
  }

  if (orders.length === 0) {
    return (
      <div className="mt-4 rounded-2xl border border-dashed border-border bg-card p-10 text-center">
        <Ticket className="mx-auto h-10 w-10 text-brand" />
        <p className="mt-3 font-display text-lg font-semibold">
          Você ainda não tem ingressos
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Explore os próximos eventos e garanta o seu.
        </p>
        <Link
          to="/eventos"
          className="bg-gradient-brand mt-5 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-brand-foreground shadow-glow"
        >
          Explorar eventos
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <ul className="mt-4 space-y-3">
      {orders.map((o) => (
        <li key={o.id}>
          <Link
            to="/pedidos/$id"
            params={{ id: o.id }}
            className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4 transition hover:border-brand"
          >
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Pedido #{o.id.slice(0, 8).toUpperCase()} ·{" "}
                {new Date(o.created_at).toLocaleDateString("pt-BR")}
              </p>
              <p className="mt-1 font-semibold">
                {o.tickets[0]?.event.title ?? "TTB"}
                {o.tickets.length > 1 ? ` +${o.tickets.length - 1}` : ""}
              </p>
              <p className="text-xs text-muted-foreground">
                {o.tickets.length} ingresso{o.tickets.length > 1 ? "s" : ""} ·{" "}
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(o.total_cents / 100)}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

interface TicketSummary {
  id: string;
  code: string;
  status: string;
  event: {
    title: string;
    starts_at: string;
    venue: string | null;
    city: string | null;
    image_url: string | null;
  };
  tier: { name: string };
}

function TicketsList() {
  const [tickets, setTickets] = useState<TicketSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("tickets")
        .select(
          "id, code, status, event:events ( title, starts_at, venue, city, image_url ), tier:ticket_tiers ( name )",
        )
        .order("created_at", { ascending: false });
      setTickets((data as unknown as TicketSummary[]) ?? []);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return <div className="mt-4 h-24 animate-pulse rounded-2xl bg-muted/40" />;
  }

  if (tickets.length === 0) {
    return (
      <div className="mt-4 rounded-2xl border border-dashed border-border bg-card p-10 text-center">
        <Ticket className="mx-auto h-10 w-10 text-brand" />
        <p className="mt-3 font-display text-lg font-semibold">
          Você ainda não tem ingressos
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Explore os próximos eventos e garanta o seu.
        </p>
        <Link
          to="/eventos"
          className="bg-gradient-brand mt-5 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-brand-foreground shadow-glow"
        >
          Explorar eventos
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <ul className="mt-4 grid gap-3 sm:grid-cols-2">
      {tickets.map((t) => (
        <li key={t.id}>
          <Link
            to="/ingressos/$id"
            params={{ id: t.id }}
            className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 transition hover:border-brand"
          >
            {t.event.image_url ? (
              <img
                src={t.event.image_url}
                alt=""
                className="h-16 w-16 flex-none rounded-xl object-cover"
              />
            ) : (
              <div className="bg-gradient-brand grid h-16 w-16 flex-none place-items-center rounded-xl text-brand-foreground">
                <Ticket className="h-6 w-6" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs uppercase tracking-wide text-brand">
                {t.tier.name}
              </p>
              <p className="mt-0.5 truncate font-semibold">{t.event.title}</p>
              <p className="mt-1 flex items-center gap-1 truncate text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {new Date(t.event.starts_at).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "short",
                  timeZone: "America/Sao_Paulo",
                })}
                {t.event.city ? ` · ${t.event.city}` : ""}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 flex-none text-muted-foreground" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
