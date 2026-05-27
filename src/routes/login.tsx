import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import bovineAnatomy from "@/assets/bovine-anatomy.png";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({
    meta: [{ title: "Acesso · CarneOS" }, { name: "robots", content: "noindex" }],
  }),
});

function LoginPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (user) navigate({ to: "/dashboard", replace: true });
  }, [user, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error("Credenciais inválidas", { description: error.message });
      return;
    }
    toast.success("Acesso autorizado");
    navigate({ to: "/dashboard", replace: true });
  };

  const onGoogle = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/dashboard",
    });
    if (result.error) {
      setLoading(false);
      toast.error("Falha no Google", { description: String(result.error) });
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard", replace: true });
  };

  return (
    <div className="grid min-h-screen grid-cols-1 bg-background lg:grid-cols-2">
      <div className="relative hidden overflow-hidden border-r border-border bg-surface lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.06]">
          <img src={bovineAnatomy} alt="" aria-hidden className="w-full max-w-2xl invert" />
        </div>
        <Link to="/" className="relative z-10 flex items-center gap-2 text-2xl font-black tracking-tighter">
          <span className="text-primary">CARNE</span>
          <span className="text-foreground">OS</span>
        </Link>
        <div className="relative z-10">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">Terminal Restrito</p>
          <h2 className="mt-4 max-w-md text-balance text-4xl font-black uppercase leading-[0.95] tracking-tighter">
            Acesso autorizado a operadores credenciados.
          </h2>
          <p className="mt-4 max-w-md text-sm text-muted-foreground">
            Sessões monitoradas. Dados de cada empresa totalmente isolados via RLS multi-tenant.
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
            ← CarneOS
          </Link>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">
            Acesso à Plataforma
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tighter">Identifique-se</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Use as credenciais da sua unidade ou entre com Google.
          </p>

          <button
            type="button"
            onClick={onGoogle}
            disabled={loading}
            className="mt-8 flex w-full items-center justify-center gap-3 border border-border bg-surface px-4 py-3 text-sm font-bold uppercase tracking-tighter transition-all hover:bg-white/5 disabled:opacity-60"
          >
            <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#fff" d="M21.35 11.1h-9.17v2.96h5.27c-.23 1.39-1.66 4.08-5.27 4.08-3.17 0-5.76-2.62-5.76-5.85s2.59-5.85 5.76-5.85c1.81 0 3.02.77 3.71 1.43l2.53-2.43C16.92 4.09 14.78 3 12.18 3 7.05 3 2.9 7.15 2.9 12.29s4.15 9.29 9.28 9.29c5.36 0 8.91-3.77 8.91-9.07 0-.61-.07-1.08-.14-1.41z"/></svg>
            Entrar com Google
          </button>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">ou</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <form className="space-y-5" onSubmit={onSubmit}>
            <div>
              <label className="mb-2 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                E-mail Operacional
              </label>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operador@frigorifico.com"
                className="w-full border border-border bg-surface px-4 py-3 text-sm outline-none transition-colors focus:border-primary"
              />
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Senha
                </label>
              </div>
              <input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full border border-border bg-surface px-4 py-3 text-sm outline-none transition-colors focus:border-primary"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center bg-primary px-4 py-3 font-mono text-xs font-bold uppercase tracking-widest text-primary-foreground transition-all hover:brightness-110 disabled:opacity-60"
            >
              {loading ? "Autenticando…" : "Entrar no Terminal"}
            </button>
          </form>

          <div className="mt-8 border-t border-border pt-6 text-center">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Primeira vez?{" "}
              <Link to="/signup" className="text-primary hover:underline">
                Cadastrar empresa
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
