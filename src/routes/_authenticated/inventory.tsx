import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Topbar } from "@/components/dashboard/Topbar";
import { useCompany } from "@/hooks/use-company";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/inventory")({
  component: InventoryPage,
  head: () => ({ meta: [{ title: "Inventário · CarneOS" }, { name: "robots", content: "noindex" }] }),
});

type Mov = {
  id: string;
  kind: "in" | "out" | "loss" | "adjust" | "butcher";
  qty: number;
  reason: string | null;
  lot: string | null;
  created_at: string;
  product_id: string | null;
};

const CARCASSES = [
  { id: "ANG-492", origin: "Angus RS · Frigo Silva", weight: 284.5, stage: "Pronto p/ desossa", days: 0, tone: "success" },
  { id: "WAG-108", origin: "Wagyu A5 · Mato Grosso", weight: 312.0, stage: "Câmara fria 2°C", days: 1, tone: "warning" },
  { id: "NEL-772", origin: "Nelore Premium GO", weight: 268.2, stage: "Processando", days: 0, tone: "primary" },
  { id: "ANG-501", origin: "Angus PR", weight: 276.4, stage: "Maturação a seco", days: 14, tone: "muted" },
  { id: "ANG-503", origin: "Angus PR", weight: 281.1, stage: "Maturação úmida", days: 21, tone: "muted" },
  { id: "WAG-110", origin: "Kobe Style MS", weight: 297.8, stage: "Câmara fria 1°C", days: 3, tone: "warning" },
];

function InventoryPage() {
  const { current } = useCompany();
  const [moves, setMoves] = useState<Mov[]>([]);

  useEffect(() => {
    if (!current) return;
    (async () => {
      const { data } = await supabase
        .from("stock_movements")
        .select("id, kind, qty, reason, lot, created_at, product_id")
        .eq("company_id", current.id)
        .order("created_at", { ascending: false })
        .limit(30);
      setMoves((data ?? []) as Mov[]);
    })();
  }, [current?.id]);

  return (
    <>
      <Topbar section="Inventário Carcaça" />
      <main className="flex-1 space-y-8 overflow-y-auto p-6 lg:p-8">
        <header>
          <h1 className="text-3xl font-black tracking-tighter">Inventário de Carcaças</h1>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Rastreabilidade total · lote → corte → cliente
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          {CARCASSES.map((c) => (
            <div key={c.id} className="marbling-hover border border-border bg-surface-2 p-5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-primary">#{c.id}</span>
                <span
                  className={
                    "border px-2 py-0.5 font-mono text-[9px] uppercase " +
                    (c.tone === "success"
                      ? "border-success/40 text-success"
                      : c.tone === "warning"
                      ? "border-warning/40 text-warning"
                      : c.tone === "primary"
                      ? "border-primary/40 text-primary"
                      : "border-border text-muted-foreground")
                  }
                >
                  {c.stage}
                </span>
              </div>
              <div className="mt-3 text-lg font-bold uppercase tracking-tighter">{c.origin}</div>
              <div className="mt-4 grid grid-cols-2 gap-3 font-mono text-xs">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Peso</div>
                  <div className="text-base text-foreground">{c.weight.toFixed(1)} kg</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Maturação</div>
                  <div className="text-base text-foreground">{c.days}d</div>
                </div>
              </div>
            </div>
          ))}
        </section>

        <section className="border border-border bg-surface-2">
          <div className="border-b border-border px-6 py-3">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Movimentações recentes · {moves.length}
            </span>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-6 py-3">Quando</th>
                <th className="px-6 py-3">Tipo</th>
                <th className="px-6 py-3 text-right">Qtd</th>
                <th className="px-6 py-3">Lote</th>
                <th className="px-6 py-3">Motivo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {moves.map((m) => (
                <tr key={m.id} className="hover:bg-white/5">
                  <td className="px-6 py-3 font-mono text-xs text-muted-foreground">
                    {new Date(m.created_at).toLocaleString("pt-BR")}
                  </td>
                  <td className="px-6 py-3">
                    <span
                      className={
                        "border px-2 py-0.5 font-mono text-[10px] uppercase " +
                        (m.kind === "out"
                          ? "border-primary/40 text-primary"
                          : m.kind === "in"
                          ? "border-success/40 text-success"
                          : m.kind === "loss"
                          ? "border-destructive/40 text-destructive"
                          : "border-border text-muted-foreground")
                      }
                    >
                      {m.kind}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right font-mono">{Number(m.qty).toFixed(3)}</td>
                  <td className="px-6 py-3 font-mono text-xs text-muted-foreground">
                    {m.lot ?? "—"}
                  </td>
                  <td className="px-6 py-3 text-xs">{m.reason ?? "—"}</td>
                </tr>
              ))}
              {moves.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-muted-foreground">
                    Nenhuma movimentação registrada ainda. As vendas no PDV geram saídas automáticas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </main>
    </>
  );
}
