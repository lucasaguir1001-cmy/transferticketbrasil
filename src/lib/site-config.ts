/**
 * Configurações centrais do domínio e da aplicação.
 * Para alterar o domínio padrão, modifique o fallback abaixo ou defina VITE_APP_URL / APP_URL no .env
 */

export function getSiteUrl(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    // No navegador, usa o próprio domínio onde está rodando
    return window.location.origin;
  }
  return (
    import.meta.env.VITE_APP_URL ||
    (typeof process !== "undefined" && process.env.APP_URL) ||
    "https://transferticketbrasil.com.br"
  ).replace(/\/$/, "");
}

export const SITE_NAME = "Transfer Ticket Brasil";
export const DEFAULT_SITE_URL = "https://transferticketbrasil.com.br";
