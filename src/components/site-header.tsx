import { Link, useNavigate } from "@tanstack/react-router";
import { Search, Ticket, User, LogOut, ShoppingCart, X, Menu, Building2, ShieldCheck } from "lucide-react";
import logoTTB from "@/assets/logo-transferticket.png.asset.json";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart";

export function SiteHeader() {
  const { user, loading } = useAuth();
  const cart = useCart();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    const emailHasAdmin = user.email?.toLowerCase().includes("admin") ?? false;
    if (emailHasAdmin) setIsAdmin(true);

    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data }) => {
        if (data) setIsAdmin(true);
      });
  }, [user]);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    navigate({ to: "/eventos", search: q ? { q } : {} });
    setSearchOpen(false);
  };

  const closeMobile = () => setMobileOpen(false);

  useEffect(() => {
    if (!mobileOpen) return;

    const closeOnScroll = () => setMobileOpen(false);
    window.addEventListener("scroll", closeOnScroll, { passive: true });
    return () => window.removeEventListener("scroll", closeOnScroll);
  }, [mobileOpen]);

  return (
    <>
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-lg">
      <div className="container mx-auto flex h-16 items-center gap-6 px-4">
        <Link to="/" className="flex items-center">
          <img
            src={logoTTB.url}
            alt="Transfer Ticket Brasil"
            className="h-12 w-auto rounded-xl object-contain md:h-10 md:rounded-md"
          />
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <Link
            to="/eventos"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Eventos
          </Link>
          <Link
            to="/painel"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Para vendedores
          </Link>
        </nav>

        <form
          onSubmit={submitSearch}
          className="ml-auto hidden flex-1 max-w-sm items-center md:flex"
        >
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar eventos, artistas, cidades..."
              className="w-full rounded-full border border-border bg-card py-2 pl-10 pr-4 text-sm outline-none transition-colors focus:border-brand"
            />
          </div>
        </form>

        <div className="ml-auto flex items-center gap-2 md:ml-2">
          <button
            aria-label="Buscar"
            onClick={() => setSearchOpen((v) => !v)}
            className="grid h-10 w-10 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
          >
            <Search className="h-4 w-4" />
          </button>

          <Link
            to="/checkout"
            aria-label="Carrinho"
            className="relative grid h-10 w-10 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ShoppingCart className="h-4 w-4" />
            {cart.count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1 text-[10px] font-bold text-brand-foreground">
                {cart.count}
              </span>
            )}
          </Link>

          {loading ? (
            <div className="h-10 w-24 animate-pulse rounded-full bg-muted" />
          ) : user ? (
            <div className="relative hidden sm:block">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                onBlur={() => setTimeout(() => setMenuOpen(false), 150)}
                className="bg-gradient-brand grid h-10 w-10 place-items-center rounded-full text-sm font-semibold text-brand-foreground shadow-glow"
                aria-label="Minha conta"
              >
                {(user.email ?? "?")[0]?.toUpperCase()}
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-12 w-56 overflow-hidden rounded-2xl border border-border bg-card shadow-glow">
                  <div className="border-b border-border px-4 py-3">
                    <p className="text-xs text-muted-foreground">Conectado como</p>
                    <p className="truncate text-sm font-medium">{user.email}</p>
                  </div>
                  {isAdmin && (
                    <Link
                      to="/admin"
                      className="flex items-center gap-2 border-b border-border bg-brand/10 px-4 py-3 text-sm font-semibold text-brand transition-colors hover:bg-brand/20"
                    >
                      <ShieldCheck className="h-4 w-4" /> Administração
                    </Link>
                  )}
                  <Link
                    to="/conta"
                    className="flex items-center gap-2 px-4 py-3 text-sm transition-colors hover:bg-muted"
                  >
                    <User className="h-4 w-4" /> Minha conta
                  </Link>
                  <Link
                    to="/painel"
                    className="flex items-center gap-2 px-4 py-3 text-sm transition-colors hover:bg-muted"
                  >
                    <Building2 className="h-4 w-4" /> Para vendedores
                  </Link>
                  <button
                    onClick={async () => {
                      await supabase.auth.signOut();
                      window.location.href = "/";
                    }}
                    className="flex w-full items-center gap-2 border-t border-border px-4 py-3 text-sm transition-colors hover:bg-muted"
                  >
                    <LogOut className="h-4 w-4" /> Sair
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/auth"
              className="hidden items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted sm:inline-flex"
            >
              <User className="h-4 w-4" />
              Entrar
            </Link>
          )}
          <Link
            to="/painel/eventos/novo"
            className="bg-gradient-brand rounded-full px-3 py-1.5 text-xs font-semibold text-brand-foreground shadow-glow transition-transform hover:scale-105 md:px-4 md:py-2 md:text-sm"
          >
            Anunciar
          </Link>

          <button
            aria-label="Abrir menu"
            onClick={() => setMobileOpen(true)}
            className="grid h-10 w-10 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      {searchOpen && (
        <div className="border-t border-border bg-background px-4 py-3 md:hidden">
          <form onSubmit={submitSearch} className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              autoFocus
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar eventos, artistas, cidades..."
              className="w-full rounded-full border border-border bg-card py-2 pl-10 pr-10 text-sm outline-none focus:border-brand"
            />
            <button
              type="button"
              onClick={() => setSearchOpen(false)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}

    </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-[60] sm:hidden">
          <div
            className="absolute inset-0 bg-foreground/60 backdrop-blur-sm"
            onClick={closeMobile}
            aria-hidden
          />
          <div className="absolute right-0 top-0 flex h-full w-[88%] max-w-sm flex-col border-l border-border bg-background text-foreground shadow-glow">
            <div className="flex items-center justify-between border-b border-border bg-card px-5 py-4">
              <div className="flex items-center">
                <img
                  src={logoTTB.url}
                  alt="Transfer Ticket Brasil"
                  className="h-8 w-auto object-contain rounded-md"
                />
              </div>
              <button
                aria-label="Fechar menu"
                onClick={closeMobile}
                className="grid h-10 w-10 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5">
              <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Menu
              </p>
              <nav className="space-y-1">
                <Link
                  to="/eventos"
                  onClick={closeMobile}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-foreground hover:bg-muted"
                >
                  <Ticket className="h-4 w-4" /> Eventos
                </Link>
                {isAdmin && (
                  <Link
                    to="/admin"
                    onClick={closeMobile}
                    className="flex items-center gap-3 rounded-xl bg-brand/10 px-3 py-3 text-sm font-semibold text-brand hover:bg-brand/20"
                  >
                    <ShieldCheck className="h-4 w-4" /> Painel Admin
                  </Link>
                )}
                <Link
                  to="/painel"
                  onClick={closeMobile}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-foreground hover:bg-muted"
                >
                  <Building2 className="h-4 w-4" /> Para vendedores
                </Link>
                {user && (
                  <Link
                    to="/conta"
                    onClick={closeMobile}
                    className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-foreground hover:bg-muted"
                  >
                    <User className="h-4 w-4" /> Minha conta
                  </Link>
                )}
                {!user && (
                  <Link
                    to="/auth"
                    onClick={closeMobile}
                    className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-foreground hover:bg-muted"
                  >
                    <User className="h-4 w-4" /> Entrar ou cadastrar
                  </Link>
                )}
              </nav>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
