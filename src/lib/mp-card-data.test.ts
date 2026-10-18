import { describe, test } from "node:test";
import { deepStrictEqual, throws } from "node:assert/strict";
import { mapCardData } from "./mp-card-data";

describe("Mercado Pago card submission", () => {
  test("maps the direct Card Payment Brick payload, not a formData wrapper", () => {
    deepStrictEqual(mapCardData({
      token: "test-card-token", payment_method_id: "visa", installments: 3,
      issuer_id: 25, payer: { identification: { type: "CPF", number: "12345678909" } },
    }), {
      token: "test-card-token", paymentMethodId: "visa", installments: 3,
      issuerId: "25", identificationType: "CPF", identificationNumber: "12345678909",
    });
  });
  test("does not send an invalid token to payment processing", () => {
    throws(() => mapCardData({ token: "", payment_method_id: "visa", installments: 1 }));
  });
});