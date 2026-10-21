import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, Clock } from "lucide-react";
import logoTTB from "@/assets/logo-transferticket.png.asset.json";
import { supabase } from "@/integrations/supabase/client";
import { useRateLimitCountdown } from "@/hooks/use-rate-limit-countdown";
import { lovable } from "@/integrations/lovable/index";
import {
  RESET_REQUEST_LIMIT,
  blockFor,
  checkRateLimit,
  formatCountdown,
  formatWait,
  parseRetryAfterMs,
  recordAttempt,
} from "@/lib/rate-limit";

export const Route = createFileRoute("/auth")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { redirect?: string } =>
    typeof search.redirect === "string" ? { redirect: search.redirect } : {},
  head: () => ({
    meta: [
      { title: "Entrar ou criar conta — TTB" },
      {
        name: "description",
        content:
          "Acesse sua conta TTB para ver seus ingressos, favoritos e histórico de compras.",
      },
      { property: "og:title", content: "Entrar ou criar conta — TTB" },
      {
        property: "og:description",
        content:
          "Acesse sua conta TTB para ver seus ingressos, favoritos e histórico de compras.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { redirect } = Route.useSearch();
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [resetSent, setResetSent] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [limitVersion, setLimitVersion] = useState(0);

  const resetKey = `reset-request:${email.trim().toLowerCase()}`;
  const resetWaitMs = useRateLimitCountdown(resetKey, RESET_REQUEST_LIMIT, limitVersion);
  const resetBlocked = mode === "forgot" && resetWaitMs > 0;

  const safeRedirect = getSafeRedirect(redirect);
  const strength = passwordStrength(password);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) {
        if (!redirect && data.session.user) {
          const { data: roleData } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", data.session.user.id)
            .eq("role", "admin")
            .maybeSingle();

          if (roleData) {
            window.location.replace("/admin");
            return;
          }
        }
        window.location.replace(safeRedirect);
      }
    });
  }, [safeRedirect, redirect]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "signup") {
      if (password !== confirmPassword) {
        toast.error("As senhas não conferem.");
        return;
      }
      if (strength.score < 3) {
        toast.error("Use ao menos 8 caracteres, com letras e números.");
        return;
      }
    }
    if (mode === "forgot") {
      const gate = checkRateLimit(resetKey, RESET_REQUEST_LIMIT);
      if (!gate.allowed) {
        toast.error(
          `Muitas solicitações de redefinição. Tente novamente em ${formatWait(gate.retryAfterMs)}.`,
        );
        return;
      }
    }
    setBusy(true);
    try {
      if (mode === "forgot") {
        recordAttempt(resetKey, RESET_REQUEST_LIMIT);
        setLimitVersion((v) => v + 1);
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/redefinir-senha`,
        });
        if (error) {
          const wait = parseRetryAfterMs(error.message);
          if (wait) {
            blockFor(resetKey, wait);
            setLimitVersion((v) => v + 1);
            throw new Error(
              `Por segurança, aguarde ${formatWait(wait)} antes de pedir outro link.`,
            );
          }
          throw error;
        }
        setResetSent(true);
      } else if (mode === "login") {
        const rawInput = email.trim().toLowerCase();
        const emailToUse = rawInput.includes("@")
          ? rawInput
          : `${rawInput}@transferticketbrasil.com.br`;

        const { data, error } = await supabase.auth.signInWithPassword({
          email: emailToUse,
          password,
        });
        if (error) throw error;
        toast.success("Bem-vindo de volta!");

        // Se o usuário logado for admin e não houver redirect explícito, direciona diretamente para /admin
        if (!redirect && data?.user) {
          const { data: roleData } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", data.user.id)
            .eq("role", "admin")
            .maybeSingle();

          if (roleData || emailToUse.toLowerCase().startsWith("admin@")) {
            window.location.replace("/admin");
            return;
          }
        }

        window.location.replace(safeRedirect);
      } else {

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}${safeRedirect}`,
            data: { full_name: fullName, phone },
          },
        });
        if (error) throw error;
        toast.success("Conta criada! Você já pode entrar.");
        setMode("login");
        setConfirmPassword("");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao autenticar";
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };


  const handleGoogle = async () => {
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/auth?redirect=${encodeURIComponent(safeRedirect)}`,
      });
      if (result.error) throw result.error;
      if (!result.redirected) window.location.replace(safeRedirect);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao entrar com Google";
      toast.error(message);
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-primary lg:block">
        <div className="bg-gradient-brand absolute inset-0 opacity-40" />
        <div className="relative flex h-full flex-col justify-between p-12 text-primary-foreground">
          <Link to="/" className="flex items-center gap-2">
            <img src={logoTTB.url} alt="Transfer Ticket Brasil" className="h-9 w-auto object-contain rounded-md" />
            <span className="font-display text-xl font-bold">
              <span className="text-brand">TTB</span>
            </span>
          </Link>
          <div>
            <h2 className="font-display text-4xl font-bold leading-tight">
              Seus ingressos, sempre à mão.
            </h2>
            <p className="mt-4 max-w-md text-primary-foreground/80">
              Guarde todos os seus eventos em um só lugar. Receba lembretes,
              acesse seu QR Code offline e compartilhe com amigos.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-8 flex items-center gap-2 lg:hidden">
            <img src={logoTTB.url} alt="Transfer Ticket Brasil" className="h-9 w-auto object-contain rounded-md" />
            <span className="font-display text-xl font-bold">
              <span className="text-brand">TTB</span>
            </span>
          </Link>

          <h1 className="font-display text-3xl font-bold">
            {mode === "login"
              ? "Entrar na sua conta"
              : mode === "signup"
                ? "Criar sua conta"
                : "Esqueci minha senha"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "login"
              ? "Acesse ingressos, favoritos e histórico."
              : mode === "signup"
                ? "Leva menos de um minuto. Grátis para sempre."
                : "Informe seu email e enviaremos um link seguro para criar uma nova senha."}
          </p>

          {mode !== "forgot" && (
            <>
              <button
                type="button"
                onClick={handleGoogle}
                disabled={busy}
                className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
                  <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.5 14.6 2.5 12 2.5 6.7 2.5 2.5 6.7 2.5 12s4.2 9.5 9.5 9.5c5.5 0 9.1-3.9 9.1-9.3 0-.6-.1-1.1-.2-1.6H12z" />
                </svg>
                Continuar com Google
              </button>

              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">ou com email</span>
                <div className="h-px flex-1 bg-border" />
              </div>
            </>
          )}

          {mode === "forgot" && resetSent && (
            <div className="mt-6 rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
              Se existir uma conta com <strong className="text-foreground">{email}</strong>,
              o link de redefinição chegará em instantes. O link expira e só pode
              ser usado uma vez — confirme pelo email antes de criar a nova senha.
            </div>
          )}


          {resetBlocked && (
            <div
              role="alert"
              aria-live="polite"
              className="mt-6 flex items-start gap-3 rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-sm"
            >
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <p className="text-foreground">
                Muitas solicitações de redefinição. Aguarde{" "}
                <strong className="tabular-nums text-destructive">
                  {formatCountdown(resetWaitMs)}
                </strong>{" "}
                para pedir um novo link.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === "signup" && (
              <>
                <Field
                  label="Nome completo"
                  type="text"
                  value={fullName}
                  onChange={setFullName}
                  required
                />
                <Field
                  label="Celular (para avisos do ingresso)"
                  type="tel"
                  value={phone}
                  onChange={setPhone}
                  placeholder="(11) 99999-9999"
                />
              </>
            )}
            <Field
              label={mode === "login" ? "Email ou usuário (ex: admin)" : "Email"}
              type={mode === "login" ? "text" : "email"}
              value={email}
              onChange={setEmail}
              required
              placeholder={mode === "login" ? "admin ou seu@email.com" : "seu@email.com"}
            />
            {mode !== "forgot" && (
              <Field
                label="Senha"
                type="password"
                value={password}
                onChange={setPassword}
                required
                minLength={mode === "signup" ? 8 : 6}
                revealable
              />
            )}
            {mode === "login" && (
              <button
                type="button"
                onClick={() => {
                  setMode("forgot");
                  setResetSent(false);
                }}
                className="text-xs font-medium text-brand hover:underline"
              >
                Esqueci minha senha
              </button>
            )}

            {mode === "signup" && (
              <ul className="space-y-1 text-[11px] text-muted-foreground">
                <li>• Mínimo de 8 caracteres</li>
                <li>• Pelo menos 1 letra e 1 número</li>
                <li>• Recomendado: 1 letra maiúscula e 1 símbolo (!@#$)</li>
              </ul>
            )}

            {mode === "signup" && (
              <>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full transition-all ${strength.color}`}
                      style={{ width: `${(strength.score / 4) * 100}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {strength.label}
                  </span>
                </div>
                <Field
                  label="Confirmar senha"
                  type="password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  required
                  minLength={8}
                  revealable
                />
                {confirmPassword.length > 0 && confirmPassword !== password && (
                  <p className="text-xs text-destructive">As senhas não conferem.</p>
                )}
              </>
            )}

            <button
              type="submit"
              disabled={busy || resetBlocked}
              className="bg-gradient-brand mt-2 w-full rounded-xl py-3 text-sm font-semibold text-brand-foreground shadow-glow transition-transform hover:scale-[1.01] disabled:opacity-50"
            >
              {resetBlocked
                ? `Aguarde ${formatCountdown(resetWaitMs)}`
                : busy
                ? "Aguarde..."
                : mode === "login"
                  ? "Entrar"
                  : mode === "signup"
                    ? "Criar conta"
                    : resetSent
                      ? "Reenviar link"
                      : "Enviar link de redefinição"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "forgot" ? (
              <button
                type="button"
                onClick={() => setMode("login")}
                className="font-semibold text-brand hover:underline"
              >
                Voltar para o login
              </button>
            ) : (
              <>
                {mode === "login" ? "Ainda não tem conta?" : "Já tem uma conta?"}{" "}
                <button
                  type="button"
                  onClick={() => setMode(mode === "login" ? "signup" : "login")}
                  className="font-semibold text-brand hover:underline"
                >
                  {mode === "login" ? "Criar conta" : "Entrar"}
                </button>
              </>
            )}
          </p>

        </div>
      </div>
    </div>
  );
}

function getSafeRedirect(redirect?: string) {
  if (!redirect) {
    return "/conta";
  }

  try {
    const url = new URL(redirect, window.location.origin);
    if (url.origin === window.location.origin) {
      return `${url.pathname}${url.search}${url.hash}`;
    }
  } catch {
    /* fallback abaixo */
  }

  if (redirect.startsWith("/") && !redirect.startsWith("//")) {
    return redirect;
  }

  return "/conta";
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

function Field({
  label,
  type,
  value,
  onChange,
  required,
  minLength,
  placeholder,
  revealable,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  minLength?: number;
  placeholder?: string;
  revealable?: boolean;
}) {
  const [show, setShow] = useState(false);
  const inputType = revealable && show ? "text" : type;

  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">
        {label}
      </span>
      <div className="relative">
        <input
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          minLength={minLength}
          placeholder={placeholder}
          className={`w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none transition-colors focus:border-brand ${revealable ? "pr-12" : ""}`}
        />
        {revealable && (
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            aria-label={show ? "Ocultar senha" : "Mostrar senha"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
    </label>
  );
}

