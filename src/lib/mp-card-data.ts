export type MpCardFormData = {
  token: string;
  payment_method_id: string;
  installments: number;
  issuer_id?: string | number | null;
  payer?: {
    email?: string;
    identification?: { type?: string; number?: string };
  };
};

export function mapCardData(data: MpCardFormData) {
  if (!data.token || !data.payment_method_id || !Number.isInteger(data.installments)) {
    throw new Error("Não foi possível validar o cartão. Confira os dados e tente novamente.");
  }
  return {
    token: data.token,
    paymentMethodId: data.payment_method_id,
    installments: data.installments,
    issuerId: data.issuer_id == null ? null : String(data.issuer_id),
    identificationType: data.payer?.identification?.type,
    identificationNumber: data.payer?.identification?.number,
  };
}