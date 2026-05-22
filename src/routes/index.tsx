import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteNav } from "@/components/site/SiteNav";
import { SiteFooter } from "@/components/site/SiteFooter";
import bovineAnatomy from "@/assets/bovine-anatomy.png";

export const Route = createFileRoute("/")({
  component: LandingPage,
  head: () => ({
    meta: [
      { title: "CarneOS — ERP de Precisão para Açougues Premium" },
      {
        name: "description",
        content:
          "Ciência na carne, lucro na precisão. Rastreabilidade cirúrgica, IA de rendimento, PDV offline e dashboards em tempo real para varejo de carnes premium.",
      },
    ],
  }),
});

const FEATURES = [
  {
    code: "01",
    title: "Desossa Digital",
    desc: "Conversão de carcaça em cortes com cálculo automático de quebra, sebo, osso e rendimento real vs previsto.",
  },
  {
    code: "02",
    title: "Rastreabilidade",
    desc: "Do lote do frigorífico ao QR Code na embalagem do cliente. Cada grama auditável.",
  },
  {
    code: "03",
    title: "IA Preditiva",
    desc: "Previsão de demanda, prevenção de desperdício e precificação dinâmica baseada em giro.",
  },
  {
    code: "04",
    title: "PDV Offline",
    desc: "Venda por peso integrada a balanças e impressoras fiscais. Sincroniza assim que a rede volta.",
  },
];

const STATS = [
  { value: "+R$ 3.2M", label: "Faturamento processado / mês" },
  { value: "94.2%", label: "Rendimento médio dos clientes" },
  { value: "0ms", label: "Latência do PDV offline" },
  { value: "429", label: "Unidades operando agora" },
];

function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />

      {/* HERO */}
      <section className="relative flex min-h-[88vh] flex-col items-center justify-center overflow-hidden border-b border-border px-6 py-24">
        <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center opacity-[0.07]">
          <img
            src={bovineAnatomy}
            alt=""
            aria-hidden
            width={1920}
            height={1080}
            className="w-full max-w-6xl object-contain invert"
          />
        </div>

        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent"
          aria-hidden
        />

        <div className="relative z-10 mx-auto max-w-5xl text-center animate-slide-up">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1">
            <span className="size-2 animate-pulse rounded-full bg-primary" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-primary">
              SaaS para Frigoríficos & Boutiques de Carne
            </span>
          </div>
          <h1 className="text-balance text-5xl font-black uppercase leading-[0.95] tracking-tighter md:text-8xl">
            Ciência na <span className="text-primary">carne.</span>
            <br />
            Lucro na precisão.
          </h1>
          <p className="mx-auto mt-8 max-w-2xl text-pretty text-base text-muted-foreground md:text-lg">
            Plataforma de gestão multiempresa para açougues e frigoríficos high-end. Rastreabilidade cirúrgica,
            IA de rendimento e operação PDV em tempo real — do recebimento da carcaça à embalagem final.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              to="/dashboard"
              className="w-full bg-primary px-10 py-4 font-bold uppercase tracking-tight text-primary-foreground transition-all hover:brightness-110 sm:w-auto"
            >
              Solicitar Acesso
            </Link>
            <a
              href="#operacoes"
              className="w-full border border-border bg-white/5 px-10 py-4 font-mono text-xs uppercase tracking-widest text-foreground transition-colors hover:bg-white/10 sm:w-auto"
            >
              Ver_Diagrama_Cortes
            </a>
          </div>
        </div>

        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-px bg-gradient-to-r from-transparent via-border to-transparent"
          aria-hidden
        />
      </section>

      {/* STATS STRIP */}
      <section className="border-b border-border bg-surface/40">
        <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-border md:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="px-6 py-8 text-center md:py-10">
              <div className="text-2xl font-black tracking-tighter text-foreground md:text-4xl">
                {s.value}
              </div>
              <div className="mt-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* DASHBOARD PREVIEW */}
      <section id="inteligencia" className="bg-surface/30 px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">
                Operational Command
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tighter md:text-4xl">
                Painel de Comando Multiloja
              </h2>
            </div>
            <Link
              to="/dashboard"
              className="font-mono text-xs uppercase tracking-widest text-muted-foreground hover:text-primary"
            >
              Abrir terminal completo →
            </Link>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-background shadow-2xl animate-slide-up">
            <div className="flex min-h-[560px]">
              {/* Sidebar mock */}
              <aside className="hidden w-64 flex-col border-r border-border lg:flex">
                <div className="border-b border-border p-6">
                  <div className="font-mono text-[10px] uppercase text-muted-foreground">
                    Filial Principal
                  </div>
                  <div className="mt-1 flex items-center justify-between text-sm font-bold">
                    MATRIZ SÃO PAULO
                    <span className="text-primary">▼</span>
                  </div>
                </div>
                <nav className="flex-1 space-y-1 p-4">
                  {[
                    { n: "01", l: "Monitoramento", active: true },
                    { n: "02", l: "Desossa & Rendimento" },
                    { n: "03", l: "Inventário Carcaça" },
                    { n: "04", l: "Logística Fria" },
                    { n: "05", l: "PDV Live" },
                    { n: "06", l: "Financeiro" },
                  ].map((i) => (
                    <div
                      key={i.n}
                      className={
                        i.active
                          ? "flex items-center gap-3 border-l-2 border-primary bg-primary/10 p-3"
                          : "flex items-center gap-3 p-3 text-muted-foreground transition-colors hover:bg-white/5"
                      }
                    >
                      <span
                        className={
                          i.active
                            ? "font-mono text-[10px] text-primary"
                            : "font-mono text-[10px]"
                        }
                      >
                        {i.n}
                      </span>
                      <span className="text-sm font-bold uppercase tracking-tighter">{i.l}</span>
                    </div>
                  ))}
                </nav>
                <div className="border-t border-border p-4">
                  <div className="rounded bg-surface-2 p-4">
                    <div className="mb-2 font-mono text-[10px] uppercase text-primary">
                      Alerta de Validade
                    </div>
                    <div className="text-xs leading-relaxed">
                      Picanha Wagyu A5 (3kg)
                      <br />
                      <span className="font-bold text-foreground underline">Vence em 48h</span>
                    </div>
                  </div>
                </div>
              </aside>

              {/* Main */}
              <div className="flex-1 space-y-8 overflow-y-auto p-8">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  <div className="marbling-hover border border-border bg-surface-2 p-6">
                    <div className="mb-4 font-mono text-[10px] uppercase text-muted-foreground">
                      Faturamento Hoje
                    </div>
                    <div className="text-4xl font-black tracking-tighter">R$ 142.980</div>
                    <div className="mt-2 font-mono text-xs text-primary">+12.4% vs ontem</div>
                  </div>

                  <div className="marbling-hover relative col-span-1 overflow-hidden border border-border bg-surface-2 p-6 md:col-span-2">
                    <div className="mb-4 font-mono text-[10px] uppercase text-muted-foreground">
                      Rendimento Real vs Previsto · Carcaça #882
                    </div>
                    <div className="mb-4 flex h-24 items-end gap-1">
                      {[60, 80, 70, 90, 75, 85, 92, 78, 88].map((h, i) => (
                        <div key={i} className="relative h-full w-full bg-surface">
                          <div
                            className="absolute bottom-0 w-full bg-primary/50 transition-all hover:bg-primary"
                            style={{ height: `${h}%` }}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="font-mono text-sm">
                      EFICIÊNCIA GLOBAL:{" "}
                      <span className="text-foreground">94.2%</span>
                    </div>
                  </div>
                </div>

                <div className="border border-border">
                  <div className="flex items-center justify-between border-b border-border bg-surface-2 px-6 py-3">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      Transações PDV ao vivo
                    </span>
                    <span className="bg-primary px-2 py-0.5 font-mono text-[10px] uppercase text-primary-foreground">
                      Live
                    </span>
                  </div>
                  <div className="divide-y divide-border">
                    {[
                      ["#88219", "14:22", "Ancho Black Angus (1.2kg)", "R$ 442,00"],
                      ["#88220", "14:25", "Prime Rib Wagyu A5 (0.8kg)", "R$ 1.120,00"],
                      ["#88221", "14:28", "Panceta Defumada (2.1kg)", "R$ 189,50"],
                      ["#88222", "14:31", "Picanha Maturada 21d (1.6kg)", "R$ 612,00"],
                    ].map(([id, hr, item, val]) => (
                      <div
                        key={id}
                        className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-white/5"
                      >
                        <div className="font-mono text-sm">
                          {id} <span className="text-muted-foreground">— {hr}</span>
                        </div>
                        <div className="hidden font-bold uppercase tracking-tight md:block">
                          {item}
                        </div>
                        <div className="font-mono text-primary">{val}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURE MATRIX */}
      <section id="operacoes" className="px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 max-w-2xl">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">
              Núcleo Operacional
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tighter md:text-5xl">
              Construído para quem trata cada corte como obra de arte.
            </h2>
          </div>
          <div className="grid gap-px border border-border bg-border md:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div
                key={f.code}
                className="marbling-hover bg-background p-8 transition-all"
              >
                <div className="mb-4 font-mono text-primary">[{f.code}]</div>
                <h3 className="mb-4 text-xl font-black uppercase tracking-tighter">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING TEASE */}
      <section id="planos" className="border-t border-border bg-surface/30 px-6 py-24">
        <div className="mx-auto max-w-5xl text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">Planos</p>
          <h2 className="mt-3 text-balance text-3xl font-black tracking-tighter md:text-5xl">
            Implantação assistida. ROI mensurável no primeiro mês.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-muted-foreground">
            Da unidade única à rede com 50+ filiais. Licenciamento por loja, com módulos liberados sob demanda
            e SLA dedicado para operações de alta volumetria.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              to="/dashboard"
              className="bg-primary px-10 py-4 font-bold uppercase tracking-tight text-primary-foreground hover:brightness-110"
            >
              Explorar Demo
            </Link>
            <a
              href="mailto:contato@carneos.app"
              className="border border-border bg-white/5 px-10 py-4 font-mono text-xs uppercase tracking-widest hover:bg-white/10"
            >
              Falar com Especialista
            </a>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
