import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useCompany } from "@/hooks/use-company";
import { useState } from "react";

const NAV = [
  { n: "01", to: "/dashboard", label: "Monitoramento" },
  { n: "02", to: "/pdv", label: "PDV Live" },
  { n: "03", to: "/products", label: "Catálogo" },
  { n: "04", to: "/inventory", label: "Inventário Carcaça" },
  { n: "05", to: "/yield", label: "Desossa & Rendimento" },
  { n: "06", to: "/logistics", label: "Logística Fria" },
  { n: "07", to: "/financial", label: "Financeiro" },
  { n: "08", to: "/traceability", label: "Rastreabilidade" },
  { n: "09", to: "/crm", label: "Clientes / CRM" },
] as const;

export function DashboardSidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { user, signOut } = useAuth();
  const { companies, current, setCurrent } = useCompany();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate({ to: "/login", replace: true });
  };

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-background lg:flex">
      <div className="relative border-b border-border p-6">
        <Link to="/" className="mb-6 flex items-center gap-2 text-xl font-black tracking-tighter">
          <span className="text-primary">CARNE</span>
          <span className="text-foreground">.OS</span>
        </Link>
        <div className="font-mono text-[10px] uppercase text-muted-foreground">Empresa Ativa</div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="mt-1 flex w-full items-center justify-between text-left text-sm font-bold uppercase tracking-tighter hover:text-primary"
        >
          <span className="truncate">{current?.name ?? "—"}</span>
          <span className="text-primary">▼</span>
        </button>
        <div className="mt-1 font-mono text-[10px] text-muted-foreground">
          {companies.length} tenant{companies.length === 1 ? "" : "s"} · plano {current?.plan ?? "—"}
        </div>
        {open && companies.length > 0 && (
          <div className="absolute inset-x-4 top-full z-40 mt-1 border border-border bg-surface-2 shadow-xl">
            {companies.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setCurrent(c);
                  setOpen(false);
                }}
                className={
                  "block w-full px-3 py-2 text-left font-mono text-xs uppercase tracking-tighter hover:bg-primary/10 " +
                  (current?.id === c.id ? "text-primary" : "text-foreground")
                }
              >
                {c.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        <div className="mb-3 px-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Operacional
        </div>
        {NAV.map((i) => {
          const active = path === i.to;
          return (
            <Link
              key={i.n}
              to={i.to}
              className={
                active
                  ? "flex items-center gap-3 border-l-2 border-primary bg-primary/10 p-3"
                  : "flex items-center gap-3 border-l-2 border-transparent p-3 text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
              }
            >
              <span className={active ? "font-mono text-[10px] text-primary" : "font-mono text-[10px]"}>
                {i.n}
              </span>
              <span className="text-sm font-bold uppercase tracking-tighter">{i.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-4">
        <div className="mb-3 font-mono text-[10px] text-muted-foreground">
          <div className="uppercase tracking-widest">Operador</div>
          <div className="mt-1 truncate text-foreground">{user?.email}</div>
        </div>
        <button
          onClick={handleLogout}
          type="button"
          className="block w-full text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-primary"
        >
          ← Encerrar sessão
        </button>
      </div>
    </aside>
  );
}
