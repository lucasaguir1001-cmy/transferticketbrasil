import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    // Revalida o JWT com o servidor de auth (não confia só no cache local).
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      // Sessão inválida/expirada — limpa qualquer resíduo e manda pro login.
      await supabase.auth.signOut().catch(() => {});
      throw redirect({
        to: "/auth",
        search: { redirect: location.href },
      });
    }
    return { user: data.user };
  },
  component: () => <Outlet />,
});
