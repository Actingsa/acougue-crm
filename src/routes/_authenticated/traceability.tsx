import { createFileRoute } from "@tanstack/react-router";
import { Topbar } from "@/components/dashboard/Topbar";

export const Route = createFileRoute("/_authenticated/traceability")({
  component: TraceabilityPage,
  head: () => ({ meta: [{ title: "Rastreabilidade · CarneOS" }, { name: "robots", content: "noindex" }] }),
});

const CHAIN = [
  { tag: "Origem", title: "Fazenda Santa Bárbara — Goiás", sub: "Angus 100% · GTA 882910 · SISBOV ativo", t: "07 nov · 06:42" },
  { tag: "Frigorífico", title: "Frigo Silva · Planta 04", sub: "Abate humanitário · SIF 1844 · Carcaça #ANG-492", t: "07 nov · 17:10" },
  { tag: "Transporte", title: "Câmara fria -2°C · 412 km", sub: "Lacre 99231 · 8h em rota · sensor estável", t: "08 nov · 01:30" },
  { tag: "Recebimento", title: "CD CarneOS Curitiba", sub: "Conferência peso ±0.4kg · etiquetado", t: "08 nov · 09:45" },
  { tag: "Maturação", title: "Câmara seca · 21 dias", sub: "Umidade 78% · temperatura 1.2°C", t: "29 nov · 09:45" },
  { tag: "Desossa", title: "Operador Marcos V.", sub: "Rendimento 94.2% · 12 cortes finais", t: "29 nov · 14:20" },
  { tag: "PDV", title: "Loja Batel · #88221", sub: "Picanha 1.6kg · cliente Premium #421", t: "29 nov · 16:08" },
];

function TraceabilityPage() {
  return (
    <>
      <Topbar section="Rastreabilidade" />
      <main className="flex-1 space-y-8 overflow-y-auto p-6 lg:p-8">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tighter">Cadeia Rastreada</h1>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Lote #ANG-492 · da fazenda à venda · selo SIF 1844
            </p>
          </div>
          <input
            placeholder="Buscar lote, GTA, código de barras…"
            className="w-72 border border-border bg-surface px-3 py-2 font-mono text-xs outline-none focus:border-primary"
          />
        </header>

        <section className="relative border border-border bg-surface-2 p-8">
          <div className="absolute left-12 top-12 bottom-12 w-px bg-primary/40" />
          <ol className="space-y-8">
            {CHAIN.map((c, i) => (
              <li key={i} className="relative grid grid-cols-[80px_1fr_auto] items-start gap-6">
                <div className="relative flex h-full items-start">
                  <span className="absolute left-12 top-2 -translate-x-1/2 size-3 rounded-full border-2 border-primary bg-background" />
                  <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-primary">
                    {c.tag}
                  </div>
                  <div className="mt-1 text-xl font-black uppercase tracking-tighter">{c.title}</div>
                  <div className="mt-1 font-mono text-xs text-muted-foreground">{c.sub}</div>
                </div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  {c.t}
                </div>
              </li>
            ))}
          </ol>
        </section>
      </main>
    </>
  );
}
