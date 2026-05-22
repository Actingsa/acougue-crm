import { createFileRoute } from "@tanstack/react-router";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
  head: () => ({
    meta: [{ title: "Terminal · CarneOS" }, { name: "robots", content: "noindex" }],
  }),
});

const KPIS = [
  { label: "Faturamento Hoje", value: "R$ 142.980", delta: "+12.4% vs ontem", tone: "primary" },
  { label: "Margem Média / kg", value: "R$ 42,90", delta: "+2.1% MoM", tone: "muted" },
  { label: "Rendimento Real", value: "94.2%", delta: "Meta 92%", tone: "success" },
  { label: "Perda Técnica", value: "1.4%", delta: "Acima da meta", tone: "warning" },
];

const TXS = [
  ["#88219", "14:22", "Ancho Black Angus", "1.2 kg", "R$ 442,00"],
  ["#88220", "14:25", "Prime Rib Wagyu A5", "0.8 kg", "R$ 1.120,00"],
  ["#88221", "14:28", "Panceta Defumada", "2.1 kg", "R$ 189,50"],
  ["#88222", "14:31", "Picanha Maturada 21d", "1.6 kg", "R$ 612,00"],
  ["#88223", "14:34", "Chorizo Argentino", "0.9 kg", "R$ 84,30"],
  ["#88224", "14:37", "T-Bone USDA Prime", "1.4 kg", "R$ 740,00"],
];

const ABC = [
  { rank: "01", name: "Picanha Wagyu A5", rev: "R$ 1.250,00", pct: 92 },
  { rank: "02", name: "Ribeye Marbling 9+", rev: "R$ 980,00", pct: 78 },
  { rank: "03", name: "Short Rib Prime", rev: "R$ 720,00", pct: 64 },
  { rank: "04", name: "Picanha Maturada", rev: "R$ 612,00", pct: 56 },
  { rank: "05", name: "T-Bone USDA", rev: "R$ 540,00", pct: 48 },
];

function DashboardPage() {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <DashboardSidebar />

      <div className="flex flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Terminal / Monitoramento
            </div>
            <span className="inline-flex items-center gap-2 border border-success/30 bg-success/10 px-2 py-0.5 font-mono text-[10px] uppercase text-success">
              <span className="size-1.5 animate-pulse rounded-full bg-success" />
              Sistema online
            </span>
          </div>
          <div className="flex items-center gap-4">
            <input
              placeholder="Buscar corte, lote, cliente…"
              className="hidden w-64 border border-border bg-surface px-3 py-2 font-mono text-xs outline-none focus:border-primary md:block"
            />
            <button className="border border-border px-3 py-2 font-mono text-[10px] uppercase tracking-widest hover:bg-white/5">
              + Novo Pedido
            </button>
            <div className="flex size-9 items-center justify-center rounded-full border border-border bg-surface font-mono text-[10px] uppercase">
              MV
            </div>
          </div>
        </header>

        <main className="flex-1 space-y-8 overflow-y-auto p-6 lg:p-8">
          {/* KPI Bento */}
          <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {KPIS.map((k) => (
              <div
                key={k.label}
                className="marbling-hover border border-border bg-surface-2 p-6 transition-all"
              >
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  {k.label}
                </div>
                <div className="mt-3 text-3xl font-black tracking-tighter md:text-4xl">
                  {k.value}
                </div>
                <div
                  className={
                    "mt-2 font-mono text-xs " +
                    (k.tone === "primary"
                      ? "text-primary"
                      : k.tone === "success"
                      ? "text-success"
                      : k.tone === "warning"
                      ? "text-warning"
                      : "text-muted-foreground")
                  }
                >
                  {k.delta}
                </div>
              </div>
            ))}
          </section>

          {/* Chart + ABC */}
          <section className="grid gap-6 lg:grid-cols-3">
            <div className="marbling-hover border border-border bg-surface-2 p-6 lg:col-span-2">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Rendimento Real vs Previsto · 24h
                </h3>
                <div className="flex items-center gap-4 font-mono text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="size-2 bg-primary" /> Real
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="size-2 bg-white/15" /> Previsto
                  </span>
                </div>
              </div>
              <div className="flex h-56 items-end gap-2">
                {[
                  [60, 90],
                  [72, 80],
                  [70, 85],
                  [85, 88],
                  [78, 76],
                  [92, 90],
                  [88, 84],
                  [94, 90],
                  [82, 88],
                  [76, 82],
                  [90, 86],
                  [95, 92],
                ].map(([r, p], i) => (
                  <div key={i} className="group relative flex h-full w-full flex-col justify-end">
                    <div
                      className="w-full bg-white/10"
                      style={{ height: `${p}%`, opacity: 0.45 }}
                    />
                    <div
                      className="absolute inset-x-0 bottom-0 w-full bg-primary/60 transition-all group-hover:bg-primary"
                      style={{ height: `${r}%` }}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-4 flex justify-between font-mono text-[10px] text-muted-foreground">
                <span>00h</span>
                <span>06h</span>
                <span>12h</span>
                <span>18h</span>
                <span>24h</span>
              </div>
            </div>

            <div className="border border-border bg-surface-2 p-6">
              <h3 className="mb-6 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Curva ABC · Top Lucro
              </h3>
              <div className="space-y-5">
                {ABC.map((c) => (
                  <div key={c.rank} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-[10px] text-primary">{c.rank}</span>
                        <span className="font-bold uppercase tracking-tighter">{c.name}</span>
                      </div>
                      <span className="font-mono text-xs text-muted-foreground">{c.rev}</span>
                    </div>
                    <div className="h-1 w-full bg-surface">
                      <div className="h-full bg-primary" style={{ width: `${c.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Live PDV */}
          <section className="border border-border">
            <div className="flex items-center justify-between border-b border-border bg-surface-2 px-6 py-3">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Transações PDV ao vivo
              </span>
              <span className="inline-flex items-center gap-2 bg-primary px-2 py-0.5 font-mono text-[10px] uppercase text-primary-foreground">
                <span className="size-1.5 animate-pulse rounded-full bg-white" />
                Live
              </span>
            </div>
            <div className="divide-y divide-border">
              <div className="grid grid-cols-12 px-6 py-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                <div className="col-span-2">Pedido</div>
                <div className="col-span-2">Hora</div>
                <div className="col-span-5">Corte</div>
                <div className="col-span-1 text-right">Peso</div>
                <div className="col-span-2 text-right">Total</div>
              </div>
              {TXS.map(([id, hr, item, kg, val]) => (
                <div
                  key={id}
                  className="grid grid-cols-12 items-center px-6 py-4 transition-colors hover:bg-white/5"
                >
                  <div className="col-span-2 font-mono text-sm">{id}</div>
                  <div className="col-span-2 font-mono text-sm text-muted-foreground">{hr}</div>
                  <div className="col-span-5 font-bold uppercase tracking-tight">{item}</div>
                  <div className="col-span-1 text-right font-mono text-xs text-muted-foreground">
                    {kg}
                  </div>
                  <div className="col-span-2 text-right font-mono text-primary">{val}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Inventário carcaça */}
          <section className="grid gap-6 lg:grid-cols-2">
            <div className="border border-border bg-surface-2 p-6">
              <h3 className="mb-6 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Inventário de Carcaças
              </h3>
              <table className="w-full text-left">
                <thead className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="pb-3 font-medium">ID</th>
                    <th className="pb-3 font-medium">Origem</th>
                    <th className="pb-3 font-medium">Peso</th>
                    <th className="pb-3 text-right font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {[
                    ["#ANG-492", "Angus RS", "284.5 kg", "Pronto", "success"],
                    ["#WAG-108", "Kobe Style MS", "312.0 kg", "Em câmara", "warning"],
                    ["#NEL-772", "Nelore Premium GO", "268.2 kg", "Processando", "primary"],
                    ["#ANG-501", "Angus PR", "276.4 kg", "Maturando 14d", "muted"],
                  ].map(([id, src, kg, st, tone]) => (
                    <tr key={id} className="border-b border-border/60 last:border-0">
                      <td className="py-4 font-mono">{id}</td>
                      <td className="py-4">{src}</td>
                      <td className="py-4 font-mono text-muted-foreground">{kg}</td>
                      <td className="py-4 text-right">
                        <span
                          className={
                            "border px-2 py-0.5 font-mono text-[10px] uppercase " +
                            (tone === "success"
                              ? "border-success/40 text-success"
                              : tone === "warning"
                              ? "border-warning/40 text-warning"
                              : tone === "primary"
                              ? "border-primary/40 text-primary"
                              : "border-border text-muted-foreground")
                          }
                        >
                          {st}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border border-border bg-surface-2 p-6">
              <h3 className="mb-6 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Alertas Operacionais
              </h3>
              <div className="space-y-4">
                {[
                  {
                    tag: "Validade",
                    title: "12 lotes próximos do vencimento",
                    sub: "Picanha Wagyu A5, Ancho Black Angus, Short Rib +9",
                    tone: "primary",
                  },
                  {
                    tag: "Estoque",
                    title: "Filé Mignon abaixo do mínimo",
                    sub: "14.3 kg / mínimo 25.0 kg — sugerir compra",
                    tone: "warning",
                  },
                  {
                    tag: "Cotação",
                    title: "Frigorífico Silva: redução de 4%",
                    sub: "Recebida há 12 minutos · válida por 24h",
                    tone: "success",
                  },
                  {
                    tag: "Câmara 04",
                    title: "Temperatura estável: -2.4°C",
                    sub: "Telemetria normal · última leitura há 1m",
                    tone: "muted",
                  },
                ].map((a) => (
                  <div
                    key={a.title}
                    className={
                      "flex gap-4 border-l-2 bg-surface px-4 py-3 " +
                      (a.tone === "primary"
                        ? "border-primary"
                        : a.tone === "warning"
                        ? "border-warning"
                        : a.tone === "success"
                        ? "border-success"
                        : "border-border")
                    }
                  >
                    <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      {a.tag}
                    </div>
                    <div>
                      <div className="text-sm font-bold uppercase tracking-tighter">{a.title}</div>
                      <div className="font-mono text-[10px] text-muted-foreground">{a.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
