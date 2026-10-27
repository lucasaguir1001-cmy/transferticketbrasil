import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { CartProvider } from "@/lib/cart";
import { Toaster } from "sonner";

function NotFoundComponent() {
  const [currentPath, setCurrentPath] = useState("");
  const [email, setEmail] = useState("admin");
  const [password, setPassword] = useState("123456");
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [sessionUser, setSessionUser] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const fullPath = window.location.pathname.toLowerCase();
      setCurrentPath(window.location.pathname + window.location.search);

      // Se por algum motivo o roteador renderizou 404 para uma rota válida de admin ou login, redireciona diretamente
      if (
        fullPath === "/admin" ||
        fullPath === "/admin/" ||
        fullPath.startsWith("/admin/") ||
        fullPath === "/painel-admin" ||
        fullPath === "/dashboard" ||
        fullPath === "/administracao" ||
        fullPath === "/adm"
      ) {
        window.location.replace("/admin");
        return;
      }

      if (
        fullPath === "/login" ||
        fullPath === "/login/" ||
        fullPath === "/entrar" ||
        fullPath === "/entrar/" ||
        fullPath === "/auth" ||
        fullPath === "/auth/"
      ) {
        window.location.replace("/login");
        return;
      }

      import("@/integrations/supabase/client").then(({ supabase }) => {
        supabase.auth.getSession().then(({ data }) => {
          if (data.session?.user?.email) {
            setSessionUser(data.session.user.email);
          }
        });
      });
    }
  }, []);

  const handleQuickLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const rawInput = email.trim().toLowerCase();
      const emailToUse = rawInput.includes("@")
        ? rawInput
        : `${rawInput}@transferticketbrasil.com.br`;

      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailToUse,
        password,
      });

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      setSuccessMsg("Conectado com sucesso! Redirecionando...");

      // Se for admin, direciona para /admin
      if (emailToUse.startsWith("admin@") || data?.user?.email?.toLowerCase().includes("admin")) {
        setTimeout(() => {
          window.location.replace("/admin");
        }, 300);
        return;
      }

      setTimeout(() => {
        window.location.replace("/conta");
      }, 300);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erro ao entrar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md text-center">
        <h1 className="text-6xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {currentPath ? `O endereço "${currentPath}" não existe ou foi movido.` : "A página que você procura não existe ou foi movida."}
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Página Inicial
          </a>
          <a
            href="/login"
            className="inline-flex items-center justify-center rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
          >
            Fazer login / Entrar
          </a>
          <a
            href="/admin"
            className="inline-flex items-center justify-center rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
          >
            Painel Admin
          </a>
        </div>

        <div className="mt-8 rounded-2xl border border-border bg-card p-6 text-left shadow-sm">
          <h3 className="text-base font-semibold text-foreground">Entrar no sistema</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Faça login diretamente abaixo para acessar o painel administrativo ou sua conta.
          </p>

          {errorMsg && (
            <div className="mt-3 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-600 dark:text-emerald-400">
              {successMsg}
            </div>
          )}

          {sessionUser ? (
            <div className="mt-4 space-y-3">
              <div className="rounded-xl bg-muted p-3 text-xs">
                <span className="font-semibold text-foreground">Conectado como:</span> {sessionUser}
              </div>
              <div className="flex gap-2">
                <a
                  href="/admin"
                  className="inline-flex flex-1 items-center justify-center rounded-xl bg-brand py-2 text-sm font-semibold text-brand-foreground hover:brightness-110"
                >
                  Abrir Painel Admin &rarr;
                </a>
                <button
                  type="button"
                  onClick={async () => {
                    const { supabase } = await import("@/integrations/supabase/client");
                    await supabase.auth.signOut();
                    setSessionUser(null);
                  }}
                  className="rounded-xl border border-border px-3 py-2 text-xs hover:bg-muted"
                >
                  Sair
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleQuickLogin} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Usuário ou Email
                </label>
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin ou seu@email.com"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Senha
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="123456"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
                />
              </div>
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-xl bg-brand py-2.5 text-sm font-semibold text-brand-foreground shadow-glow hover:brightness-110 disabled:opacity-50"
              >
                {busy ? "Entrando..." : "Entrar agora"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: unknown; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        {Boolean(error) && (
          <p className="mt-2 text-xs font-mono text-destructive bg-destructive/10 p-2 rounded max-w-sm mx-auto overflow-auto text-left">
            {error instanceof Error ? error.message : String(error)}
          </p>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Transfer Ticket Brasil — Venda e compre ingressos" },
      {
        name: "description",
        content:
          "Compre ingressos para shows e eventos ou publique seu evento com Pix, cartão, QR Code e check-in digital.",
      },
      { property: "og:title", content: "Transfer Ticket Brasil — Venda e compre ingressos" },
      {
        property: "og:description",
        content: "Compre ingressos para shows e eventos ou publique seu evento com Pix, cartão, QR Code e check-in digital.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Transfer Ticket Brasil — Venda e compre ingressos" },
      { name: "twitter:description", content: "Compre ingressos para shows e eventos ou publique seu evento com Pix, cartão, QR Code e check-in digital." },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32.png" },
      { rel: "icon", type: "image/png", sizes: "48x48", href: "/favicon-48.png" },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <CartProvider>
        <Outlet />
        <Toaster position="top-right" richColors />
      </CartProvider>
    </QueryClientProvider>
  );
}
