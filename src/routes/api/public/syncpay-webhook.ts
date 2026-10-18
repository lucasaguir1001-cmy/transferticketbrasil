import { createFileRoute } from "@tanstack/react-router";
import { confirmOrderFromSyncPay } from "@/lib/syncpay.functions";

export const Route = createFileRoute("/api/public/syncpay-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: Record<string, unknown> = {};
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const url = new URL(request.url);
        const identifier =
          (body.identifier as string) ||
          (body.id as string) ||
          ((body.data as { id?: string; identifier?: string })?.identifier) ||
          ((body.data as { id?: string })?.id) ||
          url.searchParams.get("identifier") ||
          url.searchParams.get("id");

        const status =
          (body.status as string) ||
          ((body.data as { status?: string })?.status) ||
          (body.event as string) ||
          "";

        if (!identifier) {
          console.warn("[SyncPay Webhook] No identifier found in payload:", body);
          return new Response("Ignored: Missing identifier", { status: 200 });
        }

        try {
          const res = await confirmOrderFromSyncPay(String(identifier), String(status));
          return new Response(JSON.stringify({ ok: true, result: res }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err) {
          console.error("[SyncPay Webhook Error]", err);
          return new Response("Internal Server Error", { status: 500 });
        }
      },
      GET: async () => new Response("SyncPay Webhook OK", { status: 200 }),
    },
  },
});
