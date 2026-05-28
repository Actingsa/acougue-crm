import { createFileRoute } from "@tanstack/react-router";
import { Topbar } from "@/components/dashboard/Topbar";
import { useState } from "react";
import { brl, num } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/yield")({
  component: YieldPage,
  head: () => ({ meta: [{ title: "Desossa & Rendimento · CarneOS" }, { name: "robots", content: "noindex" }] }),
});

// Reference yield map (avg %) — bovino standard
const PIECES = [
  { name: "Picanha", pct: 1.8, price: 12990 },
  { name: "Ancho / Bife Ancho", pct: 4.1, price: 14990 },
  { name: "Filé Mignon", pct: 2.6, price: 13900 },
  { name: "Contrafilé", pct: 4.3, price: 9990 },
  { name: "Maminha", pct: 1.9, price: 8990 },
  { name: "Alcatra", pct: 6.8, price: 8490 },
  { name: "Coxão Mole", pct: 7.4, price: 5990 },
  { name: "Coxão Duro", pct: 5.9, price: 5290 },
  { name: "Patinho", pct: 4.6, price: 5490 },
  { name: "Costela", pct: 9.5, price: 6490 },
  { name: "Acém", pct: 8.2, price: 3990 },
  { name: "Aparas / Moídos", pct: 12.0, price: 3490 },
  { name: "Ossos / Gordura", pct: 18.0, price: 0 },
  { name: "Perda técnica", pct: 1.4, price: 0 },
];

function YieldPage() {
  const [weight, setWeight] = useState("284.5");
  const [loss, setLoss] = useState("1.4");

  const w = parseFloat(weight) || 0;
  const lossPct = parseFloat(loss) || 0;
  const usable = w * (1 - lossPct / 100);

  let total = 0;
  const rows = PIECES.map((p) => {
    const kg = (w * p.pct) / 100;
    const value = kg * (p.price / 100);
    total += value;
    return { ...p, kg, value };
  });

  return (
    <>
      <Topbar section="Desossa & Rendimento" />
      <main className="flex-1 space-y-8 overflow-y-auto p-6 lg:p-8">
        <header>
          <h1 className="text-3xl font-black tracking-tighter">Simulador de Rendimento</h1>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Conversão carcaça → cortes finais · estimativa por peso de entrada
          </p>
        </header>

        <section className="grid gap-px bg-border md:grid-cols-4">
          <div className="bg-surface-2 p-5">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Peso da carcaça (kg)
            </div>
            <input
              value={weight}
              onChange={(e) => setWeight(e.target.value.replace(",", "."))}
              inputMode="decimal"
              className="mt-2 w-full bg-transparent font-mono text-3xl font-black tabular-nums outline-none"
            />
          </div>
          <div className="bg-surface-2 p-5">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Perda técnica (%)
            </div>
            <input
              value={loss}
              onChange={(e) => setLoss(e.target.value.replace(",", "."))}
              inputMode="decimal"
              className="mt-2 w-full bg-transparent font-mono text-3xl font-black tabular-nums outline-none"
            />
          </div>
          <div className="bg-surface-2 p-5">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Aproveitamento
            </div>
            <div className="mt-2 font-mono text-3xl font-black tabular-nums text-success">
              {num(usable, 2)} kg
            </div>
          </div>
          <div className="bg-surface-2 p-5">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Receita estimada
            </div>
            <div className="mt-2 font-mono text-3xl font-black tabular-nums text-primary">
              {brl(Math.round(total * 100))}
            </div>
          </div>
        </section>

        <section className="border border-border bg-surface-2">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-6 py-3">Corte</th>
                <th className="px-6 py-3 text-right">% carcaça</th>
                <th className="px-6 py-3 text-right">Kg gerados</th>
                <th className="px-6 py-3 text-right">Preço/kg</th>
                <th className="px-6 py-3 text-right">Receita</th>
                <th className="px-6 py-3">Participação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.name} className="hover:bg-white/5">
                  <td className="px-6 py-3 font-bold uppercase tracking-tighter">{r.name}</td>
                  <td className="px-6 py-3 text-right font-mono text-muted-foreground">
                    {r.pct.toFixed(1)}%
                  </td>
                  <td className="px-6 py-3 text-right font-mono">{num(r.kg, 2)}</td>
                  <td className="px-6 py-3 text-right font-mono text-muted-foreground">
                    {r.price ? brl(r.price) : "—"}
                  </td>
                  <td className="px-6 py-3 text-right font-mono text-primary">
                    {brl(Math.round(r.value * 100))}
                  </td>
                  <td className="px-6 py-3">
                    <div className="h-1.5 w-full bg-surface">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${Math.min(100, (r.value / (total || 1)) * 100)}%` }}
                      />
                    </div>
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
