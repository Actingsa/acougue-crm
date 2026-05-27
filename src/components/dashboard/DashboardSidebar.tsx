import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

const NAV = [
  { n: "01", to: "/dashboard", label: "Monitoramento" },
  { n: "02", to: "/dashboard", label: "Desossa & Rendimento" },
  { n: "03", to: "/dashboard", label: "Inventário Carcaça" },
  { n: "04", to: "/dashboard", label: "Logística Fria" },
  { n: "05", to: "/dashboard", label: "PDV Live" },
  { n: "06", to: "/dashboard", label: "Financeiro" },
  { n: "07", to: "/dashboard", label: "Rastreabilidade" },
  { n: "08", to: "/dashboard", label: "Clientes / CRM" },
] as const;

type Company = { id: string; name: string; slug: string };

export function DashboardSidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [current, setCurrent] = useState<Company | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("companies").select("id, name, slug");
      const list = (data ?? []) as Company[];
      setCompanies(list);

      const { data: profile } = await supabase
        .from("profiles")
        .select("current_company_id")
        .eq("id", user.id)
        .maybeSingle();
      const currentId = profile?.current_company_id;
      setCurrent(list.find((c) => c.id === currentId) ?? list[0] ?? null);
    })();
  }, [user]);

  const handleLogout = async () => {
    await signOut();
    navigate({ to: "/login", replace: true });
  };

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-background lg:flex">
      <div className="border-b border-border p-6">
        <Link to="/" className="mb-6 flex items-center gap-2 text-xl font-black tracking-tighter">
          <span className="text-primary">CARNE</span>
          <span className="text-foreground">OS</span>
        </Link>
        <div className="font-mono text-[10px] uppercase text-muted-foreground">Empresa Ativa</div>
        <button
          type="button"
          className="mt-1 flex w-full items-center justify-between text-left text-sm font-bold uppercase tracking-tighter hover:text-primary"
        >
          {current?.name ?? "—"}
          <span className="text-primary">▼</span>
        </button>
        <div className="mt-1 font-mono text-[10px] text-muted-foreground">
          {companies.length} tenant{companies.length === 1 ? "" : "s"} · isolado por RLS
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        <div className="mb-3 px-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Operacional
        </div>
        {NAV.map((i, idx) => {
          const active = idx === 0 && path === "/dashboard";
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
