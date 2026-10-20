/**
 * Cliente da API SyncPay (syncpayments.com.br)
 * Documentação: https://syncpay.apidog.io
 */

interface SyncPayTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface SyncPayClientPayload {
  name: string;
  cpf: string; // Exatamente 11 dígitos numéricos /^\d{11}$/
  email: string;
  phone: string; // Exatamente 10 ou 11 dígitos numéricos /^\d{10,11}$/
}

export interface SyncPayCashInPayload {
  amount: number; // Ex: 49.90
  description?: string;
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

export interface SyncPayTransactionData {
  reference_id?: string;
  currency?: string;
  amount?: number;
  transaction_date?: string;
  status: "pending" | "completed" | "failed" | "refunded" | "med" | string;
  description?: string | null;
  pix_code?: string | null;
  [key: string]: unknown;
}

export interface SyncPayTransactionResponse {
  identifier: string;
  status: string; // "pending" | "completed" | "failed" | "refunded" | "med"
  amount?: number;
  description?: string | null;
  pix_code?: string | null;
  transaction_date?: string;
  data?: SyncPayTransactionData;
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
 * Remove qualquer caractere não numérico e formata para 11 dígitos.
 */
export function sanitizeCpf(raw?: string | null): string {
  return String(raw || "").replace(/\D/g, "").slice(0, 11);
}

/**
 * Remove qualquer caractere não numérico e formata para 10 ou 11 dígitos.
 * Remove prefixo 55 se vier com DDI.
 */
export function sanitizePhone(raw?: string | null): string {
  const digits = String(raw || "").replace(/\D/g, "");
  if (digits.length >= 12 && digits.startsWith("55")) {
    return digits.slice(2, 13);
  }
  return digits.slice(-11);
}

/**
 * Valida e formata os dados do cliente para a API SyncPay.
 */
export function validateSyncPayClient(client: {
  name?: string;
  cpf?: string;
  email?: string;
  phone?: string;
}): SyncPayClientPayload {
  const name = (client.name || "").trim();
  const email = (client.email || "").trim();
  const cpf = sanitizeCpf(client.cpf);
  let phone = sanitizePhone(client.phone);

  if (!name || name.length < 2) {
    throw new Error("Nome completo do pagador é obrigatório.");
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("E-mail válido é obrigatório.");
  }
  if (cpf.length !== 11) {
    throw new Error("CPF inválido para Pix. Digite os 11 números do seu CPF.");
  }
  // Fallback seguro caso o cliente não informe telefone
  if (phone.length < 10 || phone.length > 11) {
    phone = "11999999999";
  }

  return { name, cpf, email, phone };
}

/**
 * Obtém ou renova o Access Token da SyncPay via client_id e client_secret.
 * Token é cacheado em memória conforme tempo de expiração retornado (padrão 1 hora).
 */
export async function getSyncPayToken(): Promise<string> {
  const clientId = process.env.SYNCPAY_CLIENT_ID?.trim();
  const clientSecret = process.env.SYNCPAY_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    throw new Error(
      "Credenciais da SyncPay não configuradas. Defina SYNCPAY_CLIENT_ID e SYNCPAY_CLIENT_SECRET nas variáveis de ambiente."
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

  const validatedClient = validateSyncPayClient(payload.client);
  const amountFormatted = Number(Number(payload.amount).toFixed(2));

  const bodyToSend = {
    amount: amountFormatted,
    description: payload.description || undefined,
    webhook_url: payload.webhook_url || undefined,
    client: validatedClient,
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(bodyToSend),
  });

  const body = await response.json();
  if (!response.ok) {
    console.error("[SyncPay Cash-In Error]", response.status, body);
    const errorMsg =
      body?.errors?.["client.cpf"]?.[0] ||
      body?.errors?.["client.phone"]?.[0] ||
      body?.errors?.["client.email"]?.[0] ||
      body?.errors?.["amount"]?.[0] ||
      body?.message ||
      body?.error ||
      "Falha ao gerar cobrança Pix na SyncPay.";
    throw new Error(errorMsg);
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

  const txData = ((body?.data as SyncPayTransactionData) || (body as SyncPayTransactionData)) || {};
  const status = String(txData.status || body.status || "pending").toLowerCase().trim();

  return {
    identifier: (txData.reference_id as string) || identifier,
    status,
    amount: txData.amount,
    description: txData.description,
    pix_code: txData.pix_code,
    transaction_date: txData.transaction_date,
    data: txData,
  };
}

/**
 * Verifica se um status retornado pela SyncPay representa pagamento aprovado/confirmado.
 */
export function isSyncPayStatusPaid(status: string): boolean {
  const normalized = String(status || "").toLowerCase().trim();
  return (
    normalized === "completed" ||
    normalized === "paid" ||
    normalized === "concluida" ||
    normalized === "concluída" ||
    normalized === "approved" ||
    normalized === "aprovado" ||
    normalized === "succeeded"
  );
}

