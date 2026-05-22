import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import bovineAnatomy from "@/assets/bovine-anatomy.png";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({
    meta: [{ title: "Acesso · CarneOS" }, { name: "robots", content: "noindex" }],
  }),
});

function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  return (
    <div className="grid min-h-screen grid-cols-1 bg-background lg:grid-cols-2">
      {/* Left — visual */}
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
            Sessões monitoradas. Autenticação multifator obrigatória para administradores e gerentes de filial.
          </p>
        </div>
        <div className="relative z-10 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          v4.1.0 · Build 2026.05
        </div>
      </div>

      {/* Right — form */}
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
            Use as credenciais fornecidas pelo administrador da sua unidade.
          </p>

          <form
            className="mt-10 space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              setLoading(true);
              setTimeout(() => navigate({ to: "/dashboard" }), 600);
            }}
          >
            <div>
              <label className="mb-2 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                E-mail Operacional
              </label>
              <input
                required
                type="email"
                placeholder="operador@frigorifico.com"
                className="w-full border border-border bg-surface px-4 py-3 text-sm outline-none transition-colors focus:border-primary"
              />
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Senha
                </label>
                <a href="#" className="font-mono text-[10px] uppercase tracking-widest text-primary hover:underline">
                  Recuperar
                </a>
              </div>
              <input
                required
                type="password"
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
              Sem acesso?{" "}
              <a href="mailto:contato@carneos.app" className="text-primary hover:underline">
                Solicitar onboarding
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
