import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Eye, EyeOff, ShieldCheck, AlertTriangle, Clock } from "lucide-react";
import logoTTB from "@/assets/logo-transferticket.png.asset.json";
import { supabase } from "@/integrations/supabase/client";
import { updatePasswordWithRecovery } from "@/lib/password-reset.functions";
import { useRateLimitCountdown } from "@/hooks/use-rate-limit-countdown";
import {
  PASSWORD_UPDATE_LIMIT,
  blockFor,
  checkRateLimit,
  formatCountdown,
  clearRateLimit,
  formatWait,
  parseRetryAfterMs,
  recordAttempt,
} from "@/lib/rate-limit";

export const Route = createFileRoute("/redefinir-senha")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Redefinir senha — TTB" },
      {
        name: "description",
        content:
          "Crie uma nova senha para sua conta TTB usando o link seguro enviado para o seu email.",
      },
      { property: "og:title", content: "Redefinir senha — TTB" },
      {
        property: "og:description",
        content:
          "Crie uma nova senha para sua conta TTB usando o link seguro enviado para o seu email.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

type Status = "checking" | "ready" | "invalid";

function readLinkError(): string | null {
  if (typeof window === "undefined") return null;
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const query = new URLSearchParams(window.location.search);
  const code = hash.get("error_code") ?? query.get("error_code");
  const desc = hash.get("error_description") ?? query.get("error_description");
  const err = hash.get("error") ?? query.get("error");
  if (!code && !err && !desc) return null;
  if (code === "otp_expired")
    return "Este link de redefinição expirou. Links são válidos por tempo limitado.";
  if (code === "access_denied" || err === "access_denied")
    return "Este link já foi utilizado ou não é mais válido.";
  return desc ? decodeURIComponent(desc.replace(/\+/g, " ")) : "Link de redefinição inválido.";
}

function ResetPasswordPage() {
  const navigate = useNavigate();
  const updatePassword = useServerFn(updatePasswordWithRecovery);
  const [status, setStatus] = useState<Status>("checking");
  const [reason, setReason] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [limitVersion, setLimitVersion] = useState(0);

  const limitKey = `password-update:${email.toLowerCase() || "anon"}`;
  const updateWaitMs = useRateLimitCountdown(limitKey, PASSWORD_UPDATE_LIMIT, limitVersion);
  const updateBlocked = updateWaitMs > 0;

  const strength = passwordStrength(password);

  useEffect(() => {
    let done = false;

    const linkError = readLinkError();
    if (linkError) {
      setReason(linkError);
      setStatus("invalid");
      return;
    }

    // O link do email cria uma sessão temporária de recuperação.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) {
        done = true;
        setEmail(session?.user.email ?? "");
        setStatus("ready");
      }
    });

    (async () => {
      const { data } = await supabase.auth.getUser();
      if (done) return;
      if (data.user) {
        setEmail(data.user.email ?? "");
        setStatus("ready");
      } else {
        // Dá um tempo para o Supabase processar o token da URL.
        setTimeout(async () => {
          const { data: retry } = await supabase.auth.getUser();
          if (retry.user) {
            setEmail(retry.user.email ?? "");
            setStatus("ready");
          } else {
            setReason(
              readLinkError() ??
                "Não encontramos uma sessão de recuperação válida. O link pode ter expirado ou já ter sido usado.",
            );
            setStatus("invalid");
          }
        }, 1200);
      }
    })();

    return () => sub.subscription.unsubscribe();
  }, []);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("As senhas não conferem.");
      return;
    }
    if (strength.score < 3) {
      toast.error("Use ao menos 8 caracteres, com letras e números.");
      return;
    }
    const gate = checkRateLimit(limitKey, PASSWORD_UPDATE_LIMIT);
    if (!gate.allowed) {
      toast.error(
        `Muitas tentativas de alteração. Tente novamente em ${formatWait(gate.retryAfterMs)}.`,
      );
      return;
    }
    setBusy(true);
    try {
      recordAttempt(limitKey, PASSWORD_UPDATE_LIMIT);
      setLimitVersion((v) => v + 1);
      // Revalida a sessão de recuperação antes de alterar a senha.
      const { data, error: userError } = await supabase.auth.getUser();
      if (userError || !data.user) {
        setReason(
          "Sua sessão de recuperação expirou antes de salvar. Solicite um novo link por email.",
        );
        setStatus("invalid");
        throw new Error("Link expirado. Solicite um novo email de redefinição.");
      }
      // A troca é feita no servidor, que revalida o token de recuperação.
      try {
        await updatePassword({ data: { password } });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erro ao alterar a senha";
        const wait = parseRetryAfterMs(message);
        if (wait) {
          blockFor(limitKey, wait);
          setLimitVersion((v) => v + 1);
          throw new Error(`Por segurança, aguarde ${formatWait(wait)} e tente novamente.`);
        }
        if (/inv[áa]lid|expir|recupera|link/i.test(message)) {
          setReason(message);
          setStatus("invalid");
        }
        throw new Error(message);
      }
      clearRateLimit(limitKey);
      toast.success("Senha alterada! Entre com a nova senha.");
      await supabase.auth.signOut();
      navigate({ to: "/auth", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao alterar a senha");
    } finally {
      setBusy(false);
    }
  };


  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-16">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center gap-2">
          <img src={logoTTB.url} alt="Transfer Ticket Brasil" className="h-9 w-auto object-contain rounded-md" />
          <span className="font-display text-xl font-bold">
            <span className="text-brand">TTB</span>
          </span>
        </Link>

        {status === "checking" && (
          <p className="text-sm text-muted-foreground">Verificando seu link seguro...</p>
        )}

        {status === "invalid" && (
          <div
            role="alert"
            className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6"
          >
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <h1 className="font-display text-2xl font-bold">
                Link inválido ou expirado
              </h1>
            </div>
            <p className="mt-3 text-sm text-foreground">
              {reason ?? "Este link de redefinição não é mais válido."}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Por segurança, o link vale por tempo limitado e só pode ser usado
              uma vez. Não é possível alterar a senha por aqui — solicite um novo
              email de redefinição.
            </p>
            <Link
              to="/auth"
              className="bg-gradient-brand mt-5 inline-block rounded-full px-5 py-2.5 text-sm font-semibold text-brand-foreground shadow-glow"
            >
              Solicitar novo link
            </Link>
          </div>
        )}


        {status === "ready" && (
          <>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-brand" />
              Email verificado{email ? `: ${email}` : ""}
            </div>
            <h1 className="font-display text-3xl font-bold">Criar nova senha</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Escolha uma senha forte para proteger sua conta.
            </p>

            {updateBlocked && (
              <div
                role="alert"
                aria-live="polite"
                className="mt-6 flex items-start gap-3 rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-sm"
              >
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <p className="text-foreground">
                  Muitas tentativas de alteração. Aguarde{" "}
                  <strong className="tabular-nums text-destructive">
                    {formatCountdown(updateWaitMs)}
                  </strong>{" "}
                  para tentar novamente.
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-3">
              <PasswordField
                label="Nova senha"
                value={password}
                onChange={setPassword}
                show={show}
                setShow={setShow}
              />
              <ul className="space-y-1 text-[11px] text-muted-foreground">
                <li>• Mínimo de 8 caracteres</li>
                <li>• Pelo menos 1 letra e 1 número</li>
                <li>• Recomendado: 1 letra maiúscula e 1 símbolo (!@#$)</li>
              </ul>
              <div className="flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full transition-all ${strength.color}`}
                    style={{ width: `${(strength.score / 4) * 100}%` }}
                  />
                </div>
                <span className="text-[11px] text-muted-foreground">{strength.label}</span>
              </div>
              <PasswordField
                label="Confirmar nova senha"
                value={confirmPassword}
                onChange={setConfirmPassword}
                show={show}
                setShow={setShow}
              />
              {confirmPassword.length > 0 && confirmPassword !== password && (
                <p className="text-xs text-destructive">As senhas não conferem.</p>
              )}

              <button
                type="submit"
                disabled={busy || updateBlocked}
                className="bg-gradient-brand mt-2 w-full rounded-xl py-3 text-sm font-semibold text-brand-foreground shadow-glow disabled:opacity-50"
              >
                {updateBlocked
                  ? `Aguarde ${formatCountdown(updateWaitMs)}`
                  : busy
                    ? "Salvando..."
                    : "Salvar nova senha"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  show,
  setShow,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  setShow: (fn: (v: boolean) => boolean) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          minLength={8}
          className="w-full rounded-xl border border-border bg-card px-4 py-3 pr-12 text-sm outline-none transition-colors focus:border-brand"
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? "Ocultar senha" : "Mostrar senha"}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </label>
  );
}

function passwordStrength(password: string) {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[a-zA-Z]/.test(password) && /\d/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password) || password.length >= 12) score++;
  const labels = ["Muito fraca", "Fraca", "Razoável", "Boa", "Forte"];
  const colors = [
    "bg-destructive",
    "bg-destructive",
    "bg-yellow-500",
    "bg-brand",
    "bg-emerald-500",
  ];
  return { score, label: labels[score]!, color: colors[score]! };
}
