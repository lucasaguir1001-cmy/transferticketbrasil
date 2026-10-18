import { createFileRoute } from "@tanstack/react-router";
import { confirmOrderFromMp } from "@/lib/mercadopago.functions";

export const Route = createFileRoute("/api/public/mp-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
        if (!token) return new Response("not configured", { status: 500 });
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response("bad json", { status: 400 });
        }
        const url = new URL(request.url);
        const type = url.searchParams.get("type") ?? (body as { type?: string })?.type;
        const paymentId =
          url.searchParams.get("data.id") ??
          (body as { data?: { id?: string | number } })?.data?.id;
        if (type !== "payment" || !paymentId) return new Response("ignored", { status: 200 });

        try {
          const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const payment = await res.json();
          if (!res.ok) return new Response("mp fetch failed", { status: 502 });
          const orderId: string | undefined = payment.external_reference;
          if (!orderId) return new Response("no ref", { status: 200 });
          await confirmOrderFromMp(orderId, payment.status);
          return new Response("ok", { status: 200 });
        } catch (err) {
          console.error("[MP webhook]", err);
          return new Response("err", { status: 500 });
        }
      },
      GET: async () => new Response("ok"),
    },
  },
});
