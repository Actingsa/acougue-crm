import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import bovineAnatomy from "@/assets/bovine-anatomy.png";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({
    meta: [{ title: "Acesso · Carne.CRM" }, { name: "robots", content: "noindex" }],
  }),
});

function LoginPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user) navigate({ to: "/dashboard", replace: true });
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const redirectUrl = `${window.location.origin}/dashboard`;
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl,
            data: { full_name: name, company_name: companyName },
          },
        });
        if (error) throw error;
        toast.success("Conta criada", { description: "Configurando seu açougue…" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Acesso concedido");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha na autenticação";
      toast.error("Não foi possível autenticar", { description: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen grid-cols-1 bg-background lg:grid-cols-2">
      <div className="relative hidden overflow-hidden border-r border-border bg-surface lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.06]">
          <img src={bovineAnatomy} alt="" aria-hidden className="w-full max-w-2xl invert" />
        </div>
        <Link to="/" className="relative z-10 flex items-center gap-2 text-2xl font-black tracking-tighter">
          <span className="text-primary">CARNE</span>
          <span className="text-foreground">.CRM</span>
        </Link>
        <div className="relative z-10">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">Terminal Restrito</p>
          <h2 className="mt-4 max-w-md text-balance text-4xl font-black uppercase leading-[0.95] tracking-tighter">
            Acesso autorizado a operadores credenciados.
          </h2>
          <p className="mt-4 max-w-md text-sm text-muted-foreground">
            Multi-tenant com isolamento total por empresa. Cada cadastro recebe uma unidade dedicada e segura.
          </p>
        </div>
        <div className="relative z-10 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          v4.1.0 · Build 2026.05
        </div>
      </div>

      <div className="flex flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <Link
            to="/"
            className="mb-8 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-primary lg:hidden"
          >
            ← Carne.CRM
          </Link>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">
            {mode === "signup" ? "Provisionar Unidade" : "Acesso à Plataforma"}
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tighter">
            {mode === "signup" ? "Criar conta" : "Identifique-se"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "signup"
              ? "Sua empresa será criada automaticamente com seus dados."
              : "Use as credenciais cadastradas."}
          </p>

          <form className="mt-10 space-y-5" onSubmit={handleSubmit}>
            {mode === "signup" && (
              <>
                <Field label="Seu Nome">
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="João da Silva"
                    className={inputCls}
                  />
                </Field>
                <Field label="Nome do Açougue / Empresa">
                  <input
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Frigorífico Prime"
                    className={inputCls}
                  />
                </Field>
              </>
            )}
            <Field label="E-mail">
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operador@frigorifico.com"
                className={inputCls}
              />
            </Field>
            <Field label="Senha">
              <input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                minLength={6}
                className={inputCls}
              />
            </Field>
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center bg-primary px-4 py-3 font-mono text-xs font-bold uppercase tracking-widest text-primary-foreground transition-all hover:brightness-110 disabled:opacity-60"
            >
              {loading
                ? "Processando…"
                : mode === "signup"
                ? "Criar conta e entrar"
                : "Entrar no Terminal"}
            </button>
          </form>

          <div className="mt-8 border-t border-border pt-6 text-center">
            <button
              type="button"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-primary"
            >
              {mode === "signin" ? (
                <>Sem conta? <span className="text-primary">Provisionar unidade →</span></>
              ) : (
                <>Já possui acesso? <span className="text-primary">Entrar →</span></>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full border border-border bg-surface px-4 py-3 text-sm outline-none transition-colors focus:border-primary";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-2 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}
