import { createFileRoute } from "@tanstack/react-router";
import { AuthPage } from "@/components/auth-page";

export const Route = createFileRoute("/login")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { redirect?: string } =>
    typeof search.redirect === "string" ? { redirect: search.redirect } : {},
  head: () => ({
    meta: [
      { title: "Entrar ou criar conta — TTB" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => <AuthPage />,
});
