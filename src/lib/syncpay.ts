/**
 * Cliente da API SyncPay (syncpayments.com.br)
 * Documentação: https://api.syncpayments.com.br/api/partner/v1
 */

interface SyncPayTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface SyncPayCashInPayload {
  amount: number; // Ex: 49.90
  description: string;
  webhook_url?: string;
  client: {
    name: string;
    cpf?: string;
    email: string;
    phone?: string;
  };
}

export interface SyncPayCashInResponse {
  message?: string;
  pix_code: string;
  identifier: string;
}

export interface SyncPayTransactionResponse {
  identifier: string;
  status: string; // "paid" | "completed" | "concluida" | "approved" | "pending" | "cancelled"
  amount?: number;
  description?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

function getBaseUrl(): string {
  return (
    process.env.SYNCPAY_BASE_URL?.trim() ||
    "https://api.syncpayments.com.br"
  ).replace(/\/$/, "");
}

/**
 * Obtém ou renova o Access Token da SyncPay via client_id e client_secret.
 */
export async function getSyncPayToken(): Promise<string> {
  const clientId = process.env.SYNCPAY_CLIENT_ID?.trim();
  const clientSecret = process.env.SYNCPAY_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    throw new Error(
      "Credenciais da SyncPay não configuradas. Defina SYNCPAY_CLIENT_ID e SYNCPAY_CLIENT_SECRET no .env."
    );
  }

  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60_000) {
    return cachedToken.token;
  }

  const url = `${getBaseUrl()}/api/partner/v1/auth-token`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("[SyncPay Auth Error]", response.status, errorBody);
    throw new Error(
      `Falha na autenticação com a SyncPay (HTTP ${response.status}): ${errorBody}`
    );
  }

  const data = (await response.json()) as SyncPayTokenResponse;
  const expiresInMs = (data.expires_in || 3600) * 1000;
  cachedToken = {
    token: data.access_token,
    expiresAt: now + expiresInMs,
  };

  return data.access_token;
}

/**
 * Cria uma cobrança Pix (Cash-In) na SyncPay.
 */
export async function createSyncPayCashIn(
  payload: SyncPayCashInPayload
): Promise<SyncPayCashInResponse> {
  const token = await getSyncPayToken();
  const url = `${getBaseUrl()}/api/partner/v1/cash-in`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  const body = await response.json();
  if (!response.ok) {
    console.error("[SyncPay Cash-In Error]", response.status, body);
    throw new Error(
      body?.message || body?.error || "Falha ao gerar cobrança Pix na SyncPay."
    );
  }

  return body as SyncPayCashInResponse;
}

/**
 * Consulta os detalhes e o status de uma transação na SyncPay.
 */
export async function getSyncPayTransaction(
  identifier: string
): Promise<SyncPayTransactionResponse> {
  const token = await getSyncPayToken();
  const url = `${getBaseUrl()}/api/partner/v1/transaction/${encodeURIComponent(identifier)}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  const body = await response.json();
  if (!response.ok) {
    console.error("[SyncPay Query Error]", response.status, body);
    throw new Error(
      body?.message || body?.error || "Falha ao consultar transação na SyncPay."
    );
  }

  return body as SyncPayTransactionResponse;
}

/**
 * Verifica se um status retornado pela SyncPay representa pagamento aprovado/confirmado.
 */
export function isSyncPayStatusPaid(status: string): boolean {
  const normalized = String(status || "").toLowerCase().trim();
  return (
    normalized === "paid" ||
    normalized === "completed" ||
    normalized === "concluida" ||
    normalized === "concluída" ||
    normalized === "approved" ||
    normalized === "aprovado" ||
    normalized === "succeeded"
  );
}
