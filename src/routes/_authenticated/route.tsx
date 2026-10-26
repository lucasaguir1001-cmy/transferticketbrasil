import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location }) => {
    // No servidor (SSR), o token de autenticação está no localStorage do navegador e não chega nos headers da requisição inicial de página.
    // Portanto, a validação de sessão ocorre no cliente para incluir as rotas no manifesto SSR e evitar 404 durante a hidratação.
    if (typeof window === "undefined") {
      return {};
    }

    // Revalida o JWT com o servidor de auth (não confia só no cache local).
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      // Sessão inválida/expirada — limpa qualquer resíduo e manda pro login.
      await supabase.auth.signOut().catch(() => {});
      throw redirect({
        to: "/login",
        search: { redirect: location.href },
      });
    }
    return { user: data.user };
  },
  component: () => <Outlet />,
});
