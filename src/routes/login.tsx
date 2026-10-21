import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/login")({
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/auth",
      search,
    });
  },
});
