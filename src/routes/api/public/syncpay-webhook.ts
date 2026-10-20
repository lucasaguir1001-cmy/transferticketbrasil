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
          return new Response(JSON.stringify({ error: "Invalid JSON" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const url = new URL(request.url);
        const dataObj = (body.data as Record<string, unknown>) || {};

        const identifier =
          (dataObj.id as string) ||
          (dataObj.identifier as string) ||
          (dataObj.reference_id as string) ||
          (body.identifier as string) ||
          (body.id as string) ||
          (body.reference_id as string) ||
          url.searchParams.get("identifier") ||
          url.searchParams.get("id");

        const status =
          (dataObj.status as string) ||
          (body.status as string) ||
          (body.event as string) ||
          "";

        if (!identifier) {
          console.warn("[SyncPay Webhook] Identificador ausente no payload:", body);
          return new Response(
            JSON.stringify({ received: true, ignored: "Missing identifier" }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        try {
          const res = await confirmOrderFromSyncPay(String(identifier), String(status));
          return new Response(JSON.stringify({ ok: true, result: res }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err) {
          console.error("[SyncPay Webhook Error]", err);
          return new Response(
            JSON.stringify({ error: "Internal Server Error" }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
      },
      GET: async () =>
        new Response(JSON.stringify({ status: "SyncPay Webhook OK" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    },
  },
});
