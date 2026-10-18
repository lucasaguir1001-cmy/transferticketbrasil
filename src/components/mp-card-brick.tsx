import { useEffect, useRef } from "react";
import { mapCardData, type MpCardFormData } from "@/lib/mp-card-data";

const PUBLIC_KEY = "APP_USR-b13c3af4-9e55-4e5b-906f-3676ee8b136f";
const SDK_SRC = "https://sdk.mercadopago.com/js/v2";

export type CardBrickResult = ReturnType<typeof mapCardData>;

type Props = {
  amount: number; // reais (número, ex: 129.90)
  payerEmail: string;
  onSubmit: (result: CardBrickResult) => Promise<void> | void;
  onError?: (err: unknown) => void;
};

let sdkPromise: Promise<void> | null = null;
function loadSdk(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if ((window as unknown as { MercadoPago?: unknown }).MercadoPago) return Promise.resolve();
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SDK_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      sdkPromise = null;
      s.remove();
      reject(new Error("Falha ao carregar Mercado Pago SDK."));
    };
    document.head.appendChild(s);
  });
  return sdkPromise;
}

export function MpCardBrick({ amount, payerEmail, onSubmit, onError }: Props) {
  const containerId = "cardPaymentBrick_container";
  const controllerRef = useRef<{ unmount?: () => void } | null>(null);
  const callbacksRef = useRef({ onSubmit, onError });
  callbacksRef.current = { onSubmit, onError };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadSdk();
        if (cancelled) return;
        const w = window as unknown as {
          MercadoPago: new (
            key: string,
            opts: { locale: string },
          ) => { bricks(): { create: (kind: string, id: string, settings: unknown) => Promise<{ unmount: () => void }> } };
        };
        const mp = new w.MercadoPago(PUBLIC_KEY, { locale: "pt-BR" });
        const bricks = mp.bricks();
        const controller = await bricks.create("cardPayment", containerId, {
          initialization: {
            amount,
            payer: { email: payerEmail || undefined },
          },
          customization: {
            paymentMethods: { minInstallments: 1, maxInstallments: 12 },
            visual: { style: { theme: "default" } },
          },
          callbacks: {
            onReady: () => {},
            onSubmit: async (data: MpCardFormData) => {
              await callbacksRef.current.onSubmit(mapCardData(data));
            },
            onError: (err: unknown) => callbacksRef.current.onError?.(err),
          },
        });
        if (cancelled) {
          controller.unmount();
          return;
        }
        controllerRef.current = controller;
      } catch (err) {
        if (!cancelled) callbacksRef.current.onError?.(err);
      }
    })();
    return () => {
      cancelled = true;
      controllerRef.current?.unmount?.();
      controllerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amount, payerEmail]);

  return <div id={containerId} />;
}
