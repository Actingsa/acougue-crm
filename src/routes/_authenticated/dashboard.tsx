import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { DashboardTopbar } from "@/components/dashboard/Topbar";
import { formatBRL } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
  head: () => ({
    meta: [{ title: "Terminal · CarneOS" }, { name: "robots", content: "noindex" }],
  }),
});

function DashboardPage() {
  const { company } = useAuth();
  const companyId = company?.id;

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const [salesRes, productsRes, lowStockRes, recentRes] = await Promise.all([
        supabase
          .from("sales")
          .select("total_cents, created_at")
          .eq("company_id", companyId!)
          .gte("created_at", startOfDay.toISOString()),
        supabase.from("products").select("id", { count: "exact", head: true }).eq("company_id", companyId!),
        supabase
          .from("products")
          .select("id, name, stock_qty, min_stock")
          .eq("company_id", companyId!)
          .filter("stock_qty", "lt", "min_stock")
          .limit(5),
        supabase
          .from("sales")
          .select("id, number, total_cents, created_at, pay_method")
          .eq("company_id", companyId!)
          .order("created_at", { ascending: false })
          .limit(6),
      ]);

      const totalCents = salesRes.data?.reduce((s, r) => s + (r.total_cents ?? 0), 0) ?? 0;
      return {
        revenueToday: totalCents,
        salesToday: salesRes.data?.length ?? 0,
        productsCount: productsRes.count ?? 0,
        lowStock: lowStockRes.data ?? [],
        recent: recentRes.data ?? [],
      };
    },
  });

  return (
    <>
      <DashboardTopbar title="Monitoramento" />
      <main className="flex-1 space-y-8 overflow-y-auto p-6 lg:p-8">
        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Kpi label="Faturamento Hoje" value={formatBRL(stats?.revenueToday ?? 0)} tone="primary" />
          <Kpi label="Vendas Hoje" value={String(stats?.salesToday ?? 0)} tone="success" />
          <Kpi label="Produtos Cadastrados" value={String(stats?.productsCount ?? 0)} tone="muted" />
          <Kpi
            label="Estoque Baixo"
            value={String(stats?.lowStock.length ?? 0)}
            tone={stats && stats.lowStock.length > 0 ? "warning" : "muted"}
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="border border-border bg-surface-2 p-6">
            <h3 className="mb-6 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Vendas recentes
            </h3>
            {!stats?.recent.length ? (
              <p className="font-mono text-xs text-muted-foreground">
                Nenhuma venda registrada ainda. Abra o PDV para iniciar.
              </p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="pb-3 font-medium">#</th>
                    <th className="pb-3 font-medium">Hora</th>
                    <th className="pb-3 font-medium">Pagto</th>
                    <th className="pb-3 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recent.map((s) => (
                    <tr key={s.id} className="border-b border-border/60 last:border-0">
                      <td className="py-3 font-mono">{s.number}</td>
                      <td className="py-3 font-mono text-muted-foreground">
                        {new Date(s.created_at).toLocaleTimeString("pt-BR")}
                      </td>
                      <td className="py-3 uppercase text-xs">{s.pay_method}</td>
                      <td className="py-3 text-right font-mono text-primary">
                        {formatBRL(s.total_cents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="border border-border bg-surface-2 p-6">
            <h3 className="mb-6 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Alertas de estoque
            </h3>
            {!stats?.lowStock.length ? (
              <p className="font-mono text-xs text-muted-foreground">
                Sem alertas. Estoques acima dos mínimos.
              </p>
            ) : (
              <ul className="space-y-3">
                {stats.lowStock.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between border-l-2 border-warning bg-surface px-4 py-3"
                  >
                    <div>
                      <div className="text-sm font-bold uppercase tracking-tighter">{p.name}</div>
                      <div className="font-mono text-[10px] text-muted-foreground">
                        {Number(p.stock_qty).toFixed(2)} / mín {Number(p.min_stock).toFixed(2)}
                      </div>
                    </div>
                    <span className="border border-warning/40 px-2 py-0.5 font-mono text-[10px] uppercase text-warning">
                      baixo
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>
    </>
  );
}

function Kpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "primary" | "success" | "warning" | "muted";
}) {
  const toneCls =
    tone === "primary"
      ? "text-primary"
      : tone === "success"
      ? "text-success"
      : tone === "warning"
      ? "text-warning"
      : "text-muted-foreground";
  return (
    <div className="marbling-hover border border-border bg-surface-2 p-6 transition-all">
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className="mt-3 text-3xl font-black tracking-tighter md:text-4xl">{value}</div>
      <div className={"mt-2 font-mono text-xs " + toneCls}>● ao vivo</div>
    </div>
  );
}
