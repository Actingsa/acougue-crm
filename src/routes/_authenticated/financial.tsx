import { createFileRoute } from "@tanstack/react-router";
import { Topbar } from "@/components/dashboard/Topbar";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/use-company";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/financial")({
  component: FinancialPage,
  head: () => ({ meta: [{ title: "Financeiro · CarneOS" }, { name: "robots", content: "noindex" }] }),
});

type Sale = {
  id: string;
  number: number;
  total_cents: number;
  pay_method: string;
  status: string;
  created_at: string;
};

const METHODS = ["cash", "debit", "credit", "pix", "voucher"] as const;
const LABELS: Record<string, string> = {
  cash: "Dinheiro",
  debit: "Débito",
  credit: "Crédito",
  pix: "PIX",
  voucher: "Voucher",
};

function FinancialPage() {
  const { current } = useCompany();
  const [sales, setSales] = useState<Sale[]>([]);

  useEffect(() => {
    if (!current) return;
    (async () => {
      const { data } = await supabase
        .from("sales")
        .select("id, number, total_cents, pay_method, status, created_at")
        .eq("company_id", current.id)
        .order("created_at", { ascending: false })
        .limit(50);
      setSales((data ?? []) as Sale[]);
    })();
  }, [current?.id]);

  const today = sales.filter(
    (s) => new Date(s.created_at).toDateString() === new Date().toDateString(),
  );
  const totalToday = today.reduce((a, b) => a + b.total_cents, 0);

  const byMethod = METHODS.map((m) => ({
    m,
    total: today.filter((s) => s.pay_method === m).reduce((a, b) => a + b.total_cents, 0),
  }));
  const maxMethod = Math.max(1, ...byMethod.map((b) => b.total));

  return (
    <>
      <Topbar section="Financeiro" />
      <main className="flex-1 space-y-8 overflow-y-auto p-6 lg:p-8">
        <header>
          <h1 className="text-3xl font-black tracking-tighter">DRE em tempo real</h1>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Fluxo de caixa · meios de pagamento · margens
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          <Kpi label="Faturamento Hoje" value={brl(totalToday)} tone="primary" />
          <Kpi label="Tickets" value={String(today.length)} tone="muted" />
          <Kpi
            label="Ticket Médio"
            value={brl(today.length ? Math.round(totalToday / today.length) : 0)}
            tone="success"
          />
          <Kpi label="Cancelamentos" value="0" tone="warning" />
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="border border-border bg-surface-2 p-6">
            <h3 className="mb-6 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Por meio de pagamento (hoje)
            </h3>
            <div className="space-y-4">
              {byMethod.map((b) => (
                <div key={b.m}>
                  <div className="flex justify-between text-sm">
                    <span className="font-bold uppercase tracking-tighter">{LABELS[b.m]}</span>
                    <span className="font-mono text-primary">{brl(b.total)}</span>
                  </div>
                  <div className="mt-1 h-1 w-full bg-surface">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${(b.total / maxMethod) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-border bg-surface-2 p-6">
            <h3 className="mb-6 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Últimas vendas
            </h3>
            <div className="divide-y divide-border">
              {sales.slice(0, 8).map((s) => (
                <div key={s.id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="font-mono text-sm">#{s.number}</div>
                    <div className="font-mono text-[10px] text-muted-foreground">
                      {new Date(s.created_at).toLocaleString("pt-BR")} · {LABELS[s.pay_method]}
                    </div>
                  </div>
                  <div className="font-mono text-base text-primary">{brl(s.total_cents)}</div>
                </div>
              ))}
              {sales.length === 0 && (
                <div className="py-6 text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Sem vendas registradas ainda
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="marbling-hover border border-border bg-surface-2 p-6">
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div
        className={
          "mt-3 text-3xl font-black tracking-tighter " +
          (tone === "primary"
            ? "text-primary"
            : tone === "success"
            ? "text-success"
            : tone === "warning"
            ? "text-warning"
            : "text-foreground")
        }
      >
        {value}
      </div>
    </div>
  );
}
