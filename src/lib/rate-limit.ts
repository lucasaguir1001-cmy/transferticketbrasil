/**
 * Limitador de tentativas no cliente (localStorage), usado como camada extra
 * junto ao limite de envio de emails do serviço de autenticação.
 */
type Bucket = { hits: number[]; blockedUntil?: number };

const PREFIX = "rl:";

function read(key: string): Bucket {
  if (typeof window === "undefined") return { hits: [] };
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (!raw) return { hits: [] };
    const parsed = JSON.parse(raw) as Bucket;
    return { hits: Array.isArray(parsed.hits) ? parsed.hits : [], blockedUntil: parsed.blockedUntil };
  } catch {
    return { hits: [] };
  }
}

function write(key: string, bucket: Bucket) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(bucket));
  } catch {
    /* storage indisponível: segue sem limite local */
  }
}

export type RateLimitConfig = {
  /** Máximo de tentativas dentro da janela. */
  max: number;
  /** Janela em milissegundos. */
  windowMs: number;
  /** Intervalo mínimo entre duas tentativas. */
  cooldownMs?: number;
  /** Bloqueio aplicado ao estourar o limite. */
  blockMs?: number;
};

export type RateLimitResult = { allowed: boolean; retryAfterMs: number };

/** Consulta o limite sem registrar tentativa. */
export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const bucket = read(key);

  if (bucket.blockedUntil && bucket.blockedUntil > now) {
    return { allowed: false, retryAfterMs: bucket.blockedUntil - now };
  }

  const hits = bucket.hits.filter((t) => now - t < config.windowMs);

  if (config.cooldownMs && hits.length > 0) {
    const last = Math.max(...hits);
    const wait = config.cooldownMs - (now - last);
    if (wait > 0) return { allowed: false, retryAfterMs: wait };
  }

  if (hits.length >= config.max) {
    const oldest = Math.min(...hits);
    const wait = config.blockMs ?? config.windowMs - (now - oldest);
    return { allowed: false, retryAfterMs: Math.max(wait, 1000) };
  }

  return { allowed: true, retryAfterMs: 0 };
}

/** Registra uma tentativa e aplica bloqueio se estourar o limite. */
export function recordAttempt(key: string, config: RateLimitConfig) {
  const now = Date.now();
  const bucket = read(key);
  const hits = bucket.hits.filter((t) => now - t < config.windowMs);
  hits.push(now);
  const next: Bucket = { hits };
  if (hits.length >= config.max && config.blockMs) {
    next.blockedUntil = now + config.blockMs;
  }
  write(key, next);
}

/** Bloqueia manualmente (ex.: resposta 429 do servidor). */
export function blockFor(key: string, ms: number) {
  const bucket = read(key);
  write(key, { hits: bucket.hits, blockedUntil: Date.now() + ms });
}

export function clearRateLimit(key: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PREFIX + key);
  } catch {
    /* noop */
  }
}

export function formatWait(ms: number): string {
  const seconds = Math.ceil(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} min`;
}

/** Contagem regressiva precisa, no formato m:ss (ou s quando < 1 min). */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/** Extrai os segundos sugeridos por mensagens 429 do serviço de auth. */
export function parseRetryAfterMs(message: string): number | null {
  const match = /after (\d+) seconds?/i.exec(message);
  if (match?.[1]) return Number(match[1]) * 1000;
  return null;
}

export const RESET_REQUEST_LIMIT: RateLimitConfig = {
  max: 3,
  windowMs: 15 * 60 * 1000,
  cooldownMs: 60 * 1000,
  blockMs: 15 * 60 * 1000,
};

export const PASSWORD_UPDATE_LIMIT: RateLimitConfig = {
  max: 5,
  windowMs: 10 * 60 * 1000,
  cooldownMs: 3 * 1000,
  blockMs: 10 * 60 * 1000,
};
