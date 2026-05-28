import { createFileRoute } from "@tanstack/react-router";
import { Topbar } from "@/components/dashboard/Topbar";

export const Route = createFileRoute("/_authenticated/logistics")({
  component: LogisticsPage,
  head: () => ({ meta: [{ title: "Logística Fria · CarneOS" }, { name: "robots", content: "noindex" }] }),
});

const CHAMBERS = [
  { id: "CAM-01", name: "Câmara Resfriamento A", temp: -1.8, target: -2.0, hum: 84, capacity: 92, status: "ok" },
  { id: "CAM-02", name: "Câmara Maturação Seca", temp: 1.2, target: 1.0, hum: 78, capacity: 64, status: "ok" },
  { id: "CAM-03", name: "Câmara Maturação Úmida", temp: 0.8, target: 1.0, hum: 88, capacity: 71, status: "ok" },
  { id: "CAM-04", name: "Freezer Estoque", temp: -19.2, target: -18.0, hum: 0, capacity: 88, status: "warn" },
  { id: "CAM-05", name: "Antecâmara PDV", temp: 3.4, target: 3.0, hum: 70, capacity: 45, status: "ok" },
  { id: "CAM-06", name: "Expedição", temp: 5.1, target: 5.0, hum: 65, capacity: 22, status: "ok" },
];

const ROUTES = [
  { id: "RT-2210", driver: "Carlos M.", veh: "Iveco Daily Refrig.", stops: 8, eta: "16:40", status: "Em rota" },
  { id: "RT-2211", driver: "Daniel R.", veh: "Hilux Câmara Fria", stops: 5, eta: "17:10", status: "Carregando" },
  { id: "RT-2212", driver: "Patrícia G.", veh: "Sprinter -18°C", stops: 12, eta: "18:25", status: "Em rota" },
];

function LogisticsPage() {
  return (
    <>
      <Topbar section="Logística Fria" />
      <main className="flex-1 space-y-8 overflow-y-auto p-6 lg:p-8">
        <header>
          <h1 className="text-3xl font-black tracking-tighter">Cadeia do Frio</h1>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Telemetria · câmaras · expedição · rotas
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          {CHAMBERS.map((c) => {
            const delta = c.temp - c.target;
            const warn = c.status === "warn" || Math.abs(delta) > 1;
            return (
              <div key={c.id} className="border border-border bg-surface-2 p-5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-primary">{c.id}</span>
                  <span
                    className={
                      "size-1.5 animate-pulse rounded-full " +
                      (warn ? "bg-warning" : "bg-success")
                    }
                  />
                </div>
                <div className="mt-2 text-sm font-bold uppercase tracking-tighter">{c.name}</div>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="font-mono text-4xl font-black tabular-nums text-primary">
                    {c.temp.toFixed(1)}°
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    alvo {c.target.toFixed(1)}°
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 font-mono text-xs text-muted-foreground">
                  <div>
                    <div className="text-[10px] uppercase tracking-widest">Umidade</div>
                    <div className="text-foreground">{c.hum}%</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-widest">Ocupação</div>
                    <div className="text-foreground">{c.capacity}%</div>
                  </div>
                </div>
                <div className="mt-3 h-1 w-full bg-surface">
                  <div
                    className={warn ? "h-full bg-warning" : "h-full bg-success"}
                    style={{ width: `${c.capacity}%` }}
                  />
                </div>
              </div>
            );
          })}
        </section>

        <section className="border border-border bg-surface-2">
          <div className="border-b border-border px-6 py-3">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Rotas de entrega ativas
            </span>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-6 py-3">Rota</th>
                <th className="px-6 py-3">Motorista</th>
                <th className="px-6 py-3">Veículo</th>
                <th className="px-6 py-3 text-right">Paradas</th>
                <th className="px-6 py-3 text-right">ETA</th>
                <th className="px-6 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {ROUTES.map((r) => (
                <tr key={r.id} className="hover:bg-white/5">
                  <td className="px-6 py-3 font-mono text-primary">{r.id}</td>
                  <td className="px-6 py-3">{r.driver}</td>
                  <td className="px-6 py-3 text-muted-foreground">{r.veh}</td>
                  <td className="px-6 py-3 text-right font-mono">{r.stops}</td>
                  <td className="px-6 py-3 text-right font-mono">{r.eta}</td>
                  <td className="px-6 py-3 text-right">
                    <span className="border border-primary/40 px-2 py-0.5 font-mono text-[10px] uppercase text-primary">
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </>
  );
}
