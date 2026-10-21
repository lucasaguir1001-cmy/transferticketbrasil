import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/entrar")({
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/auth",
      search,
    });
  },
});
