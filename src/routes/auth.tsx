import { createFileRoute } from "@tanstack/react-router";
import { AuthPage } from "@/components/auth-page";

export const Route = createFileRoute("/auth")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { redirect?: string } =>
    typeof search.redirect === "string" ? { redirect: search.redirect } : {},
  head: () => ({
    meta: [
      { title: "Entrar ou criar conta — TTB" },
      {
        name: "description",
        content:
          "Acesse sua conta TTB para ver seus ingressos, favoritos e histórico de compras.",
      },
      { property: "og:title", content: "Entrar ou criar conta — TTB" },
      {
        property: "og:description",
        content:
          "Acesse sua conta TTB para ver seus ingressos, favoritos e histórico de compras.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => <AuthPage />,
});
