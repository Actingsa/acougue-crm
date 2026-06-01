import { Link, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";

const NAV = [
  { n: "01", to: "/dashboard", label: "Monitoramento" },
  { n: "02", to: "/pdv", label: "PDV / Novo Pedido" },
  { n: "03", to: "/products", label: "Produtos / Cortes" },
  { n: "04", to: "/inventory", label: "Estoque & Movimentos" },
  { n: "05", to: "/customers", label: "Clientes" },
  { n: "06", to: "/sales", label: "Vendas" },
  { n: "07", to: "/team", label: "Equipe & Permissões" },
] as const;

export function DashboardSidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { company, user, signOut, isPlatformAdmin } = useAuth();


  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-background lg:flex">
      <div className="border-b border-border p-6">
        <Link to="/" className="mb-6 flex items-center gap-2 text-xl font-black tracking-tighter">
          <span className="text-primary">CARNE</span>
          <span className="text-foreground">.CRM</span>
        </Link>
        <div className="font-mono text-[10px] uppercase text-muted-foreground">Empresa</div>
        <div className="mt-1 truncate text-sm font-bold uppercase tracking-tighter">
          {company?.name ?? "—"}
        </div>
        <div className="mt-1 font-mono text-[10px] text-muted-foreground">
          #{company?.slug?.slice(0, 18) ?? "—"}
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        <div className="mb-3 px-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Operacional
        </div>
        {NAV.map((i) => {
          const active = path === i.to;
          return (
            <Link
              key={i.to}
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
        <div className="mb-3 truncate font-mono text-[10px] uppercase text-muted-foreground">
          {user?.email}
        </div>
        <button
          type="button"
          onClick={() => signOut()}
          className="block w-full text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-primary"
        >
          ← Sair do Terminal
        </button>
      </div>
    </aside>
  );
}
