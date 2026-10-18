import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const schema = z.object({
  password: z
    .string()
    .min(8, "A senha deve ter ao menos 8 caracteres.")
    .max(72, "A senha deve ter no máximo 72 caracteres.")
    .regex(/[A-Za-zÀ-ÿ]/, "A senha deve conter ao menos uma letra.")
    .regex(/[0-9]/, "A senha deve conter ao menos um número."),
});

/** Métodos de autenticação aceitos para uma troca de senha por link de recuperação. */
const RECOVERY_METHODS = new Set(["recovery", "otp", "magiclink", "email", "email_change"]);

/** Janela máxima (segundos) entre a autenticação pelo link e a troca de senha. */
const MAX_AUTH_AGE_SECONDS = 60 * 60;

export const updatePasswordWithRecovery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => schema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;

    // 1) Revalida o token direto no serviço de auth: tokens revogados,
    // expirados ou já usados falham aqui, mesmo que a interface seja burlada.
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user || userData.user.id !== userId) {
      throw new Error(
        "Sessão de recuperação inválida ou expirada. Solicite um novo link por email.",
      );
    }

    // 2) Exige que a sessão tenha vindo de um link de recuperação/OTP.
    const amr = Array.isArray((claims as { amr?: unknown }).amr)
      ? ((claims as { amr: Array<{ method?: string; timestamp?: number }> }).amr ?? [])
      : [];
    const recoveryEntry = amr.find((entry) => RECOVERY_METHODS.has(entry?.method ?? ""));
    if (amr.length > 0 && !recoveryEntry) {
      throw new Error(
        "Esta sessão não foi criada por um link de redefinição. Solicite um novo link por email.",
      );
    }

    // 3) Rejeita links antigos: a autenticação precisa ser recente.
    const nowSeconds = Math.floor(Date.now() / 1000);
    const authTime =
      recoveryEntry?.timestamp ??
      (typeof (claims as { iat?: number }).iat === "number"
        ? (claims as { iat: number }).iat
        : null);
    if (authTime && nowSeconds - authTime > MAX_AUTH_AGE_SECONDS) {
      throw new Error("Este link de redefinição expirou. Solicite um novo link por email.");
    }

    // 4) Troca a senha com privilégio de servidor, após todas as validações.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: data.password,
    });
    if (error) {
      throw new Error(error.message || "Não foi possível alterar a senha.");
    }

    return { ok: true as const };
  });
