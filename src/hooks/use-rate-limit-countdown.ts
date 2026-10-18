import { useEffect, useState } from "react";
import { checkRateLimit, type RateLimitConfig } from "@/lib/rate-limit";

/**
 * Observa o bloqueio de rate limit de uma chave e devolve o tempo restante,
 * atualizado a cada segundo. `version` força a releitura após uma tentativa.
 */
export function useRateLimitCountdown(
  key: string,
  config: RateLimitConfig,
  version = 0,
): number {
  const [remainingMs, setRemainingMs] = useState(0);

  useEffect(() => {
    const tick = () => {
      const { allowed, retryAfterMs } = checkRateLimit(key, config);
      setRemainingMs(allowed ? 0 : retryAfterMs);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [key, config, version]);

  return remainingMs;
}
