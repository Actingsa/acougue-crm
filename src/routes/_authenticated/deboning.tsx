import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { DashboardTopbar } from "@/components/dashboard/Topbar";

export const Route = createFileRoute("/_authenticated/deboning")({
  component: DeboningPage,
  head: () => ({ meta: [{ title: "Desossa Digital · Carne.CRM" }] }),
});

type Product = {
  id: string;
  name: string;
  unit: "kg" | "un";
  stock_qty: number;
  category: string | null;
};

type OutputKind = "cut" | "fat" | "bone" | "loss";

type OutputRow = {
  product_id: string;
  name: string;
  kind: OutputKind;
  qty_real: string;
  qty_expected: string;
  unit: "kg" | "un";
};

type Session = {
  id: string;
  created_at: string;
  carcass_name: string;
  carcass_qty: number;
  output_cut_qty: number;
  output_fat_qty: number;
  output_bone_qty: number;
  output_loss_qty: number;
  real_yield_pct: number;
  expected_yield_pct: number | null;
  notes: string | null;
};

const KIND_LABEL: Record<OutputKind, string> = {
  cut: "Corte",
  fat: "Sebo",
  bone: "Osso",
  loss: "Perda",
};

function emptyRow(): OutputRow {
  return {
    product_id: "",
    name: "",
    kind: "cut",
    qty_real: "",
    qty_expected: "",
    unit: "kg",
  };
}

function DeboningPage() {
  const { company } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  // Form state
  const [carcassId, setCarcassId] = useState("");
  const [carcassName, setCarcassName] = useState("");
  const [carcassQty, setCarcassQty] = useState("");
  const [expectedYield, setExpectedYield] = useState("");
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<OutputRow[]>([emptyRow()]);

  const { data: products = [] } = useQuery({
    queryKey: ["deb-products", company?.id],
    enabled: !!company?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, unit, stock_qty, category")
        .eq("company_id", company!.id)
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data as Product[];
    },
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ["deb-sessions", company?.id],
    enabled: !!company?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deboning_sessions")
        .select(
          "id, created_at, carcass_name, carcass_qty, output_cut_qty, output_fat_qty, output_bone_qty, output_loss_qty, real_yield_pct, expected_yield_pct, notes",
        )
        .eq("company_id", company!.id)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data as Session[];
    },
  });

  const totals = useMemo(() => {
    const carcass = parseFloat(carcassQty.replace(",", ".")) || 0;
    let cut = 0,
      fat = 0,
      bone = 0,
      total = 0;
    for (const r of rows) {
      const q = parseFloat(r.qty_real.replace(",", ".")) || 0;
      total += q;
      if (r.kind === "cut") cut += q;
      if (r.kind === "fat") fat += q;
      if (r.kind === "bone") bone += q;
    }
    const loss = Math.max(carcass - total, 0);
    const yieldPct = carcass > 0 ? (cut / carcass) * 100 : 0;
    const expected = parseFloat(expectedYield.replace(",", ".")) || 0;
    return { carcass, cut, fat, bone, total, loss, yieldPct, expected };
  }, [rows, carcassQty, expectedYield]);

  const reset = () => {
    setCarcassId("");
    setCarcassName("");
    setCarcassQty("");
    setExpectedYield("");
    setNotes("");
    setRows([emptyRow()]);
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!company) throw new Error("Sem empresa");
      if (!carcassName || totals.carcass <= 0)
        throw new Error("Informe a carcaça e o peso bruto");
      const validOutputs = rows
        .filter((r) => (r.name || r.product_id) && (parseFloat(r.qty_real.replace(",", ".")) || 0) > 0)
        .map((r) => ({
          product_id: r.product_id || null,
          name: r.name || products.find((p) => p.id === r.product_id)?.name || "—",
          kind: r.kind,
          qty_real: parseFloat(r.qty_real.replace(",", ".")) || 0,
          qty_expected: r.qty_expected
            ? parseFloat(r.qty_expected.replace(",", ".")) || 0
            : null,
          unit: r.unit,
        }));
      if (validOutputs.length === 0) throw new Error("Adicione ao menos 1 corte");

      const { error } = await supabase.rpc("register_deboning", {
        _company_id: company.id,
        _carcass_product_id: (carcassId || null) as unknown as string,
        _carcass_name: carcassName,
        _carcass_qty: totals.carcass,
        _carcass_unit: "kg",
        _expected_yield_pct: (totals.expected || null) as unknown as number,
        _notes: notes,
        _outputs: validOutputs as never,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Desossa registrada · estoque atualizado");
      qc.invalidateQueries({ queryKey: ["deb-sessions"] });
      qc.invalidateQueries({ queryKey: ["deb-products"] });
      qc.invalidateQueries({ queryKey: ["inv-products"] });
      setOpen(false);
      reset();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <DashboardTopbar
        title="Desossa Digital"
        action={
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="border border-primary bg-primary px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-primary-foreground"
          >
            + Nova Desossa
          </button>
        }
      />

      <main className="space-y-6 p-6">
        <section className="grid gap-4 sm:grid-cols-4">
          <Kpi label="Sessões (30)" value={String(sessions.length)} />
          <Kpi
            label="Carcaça processada"
            value={`${sessions.reduce((a, s) => a + Number(s.carcass_qty || 0), 0).toFixed(2)} kg`}
          />
          <Kpi
            label="Rendimento médio"
            value={
              sessions.length
                ? `${(
                    sessions.reduce((a, s) => a + Number(s.real_yield_pct || 0), 0) /
                    sessions.length
                  ).toFixed(1)}%`
                : "—"
            }
          />
          <Kpi
            label="Quebra total"
            value={`${sessions.reduce((a, s) => a + Number(s.output_loss_qty || 0), 0).toFixed(2)} kg`}
          />
        </section>

        <section className="border border-border">
          <header className="flex items-center justify-between border-b border-border p-4">
            <h2 className="text-sm font-bold uppercase tracking-tighter">Histórico</h2>
            <span className="font-mono text-[10px] uppercase text-muted-foreground">
              Últimas 30
            </span>
          </header>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/5 font-mono text-[10px] uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Data</th>
                  <th className="px-3 py-2 text-left">Carcaça</th>
                  <th className="px-3 py-2 text-right">Bruto</th>
                  <th className="px-3 py-2 text-right">Cortes</th>
                  <th className="px-3 py-2 text-right">Sebo</th>
                  <th className="px-3 py-2 text-right">Osso</th>
                  <th className="px-3 py-2 text-right">Quebra</th>
                  <th className="px-3 py-2 text-right">Real %</th>
                  <th className="px-3 py-2 text-right">Prev %</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => {
                  const diff =
                    s.expected_yield_pct != null
                      ? Number(s.real_yield_pct) - Number(s.expected_yield_pct)
                      : null;
                  return (
                    <tr key={s.id} className="border-t border-border">
                      <td className="px-3 py-2 font-mono text-[11px]">
                        {new Date(s.created_at).toLocaleString("pt-BR")}
                      </td>
                      <td className="px-3 py-2">{s.carcass_name}</td>
                      <td className="px-3 py-2 text-right">{Number(s.carcass_qty).toFixed(2)}</td>
                      <td className="px-3 py-2 text-right">{Number(s.output_cut_qty).toFixed(2)}</td>
                      <td className="px-3 py-2 text-right">{Number(s.output_fat_qty).toFixed(2)}</td>
                      <td className="px-3 py-2 text-right">{Number(s.output_bone_qty).toFixed(2)}</td>
                      <td className="px-3 py-2 text-right">{Number(s.output_loss_qty).toFixed(2)}</td>
                      <td
                        className={
                          "px-3 py-2 text-right font-bold " +
                          (diff == null
                            ? ""
                            : diff >= 0
                              ? "text-success"
                              : "text-destructive")
                        }
                      >
                        {Number(s.real_yield_pct).toFixed(1)}%
                      </td>
                      <td className="px-3 py-2 text-right text-muted-foreground">
                        {s.expected_yield_pct != null
                          ? `${Number(s.expected_yield_pct).toFixed(1)}%`
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
                {sessions.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-6 text-center text-muted-foreground">
                      Nenhuma desossa registrada ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4">
          <div className="my-8 w-full max-w-4xl border border-border bg-background">
            <header className="flex items-center justify-between border-b border-border p-4">
              <h3 className="text-sm font-bold uppercase tracking-tighter">Nova Desossa</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="font-mono text-[10px] uppercase text-muted-foreground hover:text-primary"
              >
                fechar ✕
              </button>
            </header>

            <div className="space-y-5 p-5">
              <div className="grid gap-3 sm:grid-cols-4">
                <div className="sm:col-span-2">
                  <Label>Carcaça (produto)</Label>
                  <select
                    value={carcassId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setCarcassId(id);
                      const p = products.find((x) => x.id === id);
                      if (p) setCarcassName(p.name);
                    }}
                    className="h-9 w-full border border-input bg-transparent px-2 text-sm"
                  >
                    <option value="">— Avulsa / sem cadastro —</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({Number(p.stock_qty).toFixed(2)} {p.unit})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Peso bruto (kg)</Label>
                  <input
                    value={carcassQty}
                    onChange={(e) => setCarcassQty(e.target.value)}
                    placeholder="0,000"
                    inputMode="decimal"
                    className="h-9 w-full border border-input bg-transparent px-2 text-sm"
                  />
                </div>
                <div>
                  <Label>Rend. previsto %</Label>
                  <input
                    value={expectedYield}
                    onChange={(e) => setExpectedYield(e.target.value)}
                    placeholder="65"
                    inputMode="decimal"
                    className="h-9 w-full border border-input bg-transparent px-2 text-sm"
                  />
                </div>
              </div>

              {!carcassId && (
                <div>
                  <Label>Descrição da carcaça</Label>
                  <input
                    value={carcassName}
                    onChange={(e) => setCarcassName(e.target.value)}
                    placeholder="Ex: Boi inteiro, lote 12/06"
                    className="h-9 w-full border border-input bg-transparent px-2 text-sm"
                  />
                </div>
              )}

              <div className="border border-border">
                <header className="flex items-center justify-between border-b border-border p-3">
                  <h4 className="text-xs font-bold uppercase tracking-tighter">
                    Saídas (cortes / sebo / osso)
                  </h4>
                  <button
                    type="button"
                    onClick={() => setRows((r) => [...r, emptyRow()])}
                    className="border border-primary px-3 py-1 font-mono text-[10px] uppercase text-primary"
                  >
                    + linha
                  </button>
                </header>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-white/5 font-mono text-[10px] uppercase text-muted-foreground">
                      <tr>
                        <th className="px-2 py-2 text-left">Produto</th>
                        <th className="px-2 py-2 text-left">Tipo</th>
                        <th className="px-2 py-2 text-right">Peso real</th>
                        <th className="px-2 py-2 text-right">Previsto</th>
                        <th className="px-2 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => (
                        <tr key={i} className="border-t border-border align-top">
                          <td className="px-2 py-2">
                            <select
                              value={r.product_id}
                              onChange={(e) => {
                                const id = e.target.value;
                                const p = products.find((x) => x.id === id);
                                setRows((rs) =>
                                  rs.map((rr, idx) =>
                                    idx === i
                                      ? {
                                          ...rr,
                                          product_id: id,
                                          name: p?.name ?? rr.name,
                                          unit: (p?.unit as "kg" | "un") ?? rr.unit,
                                        }
                                      : rr,
                                  ),
                                );
                              }}
                              className="mb-1 h-8 w-full border border-input bg-transparent px-2 text-xs"
                            >
                              <option value="">— sem cadastro —</option>
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                            {!r.product_id && (
                              <input
                                value={r.name}
                                onChange={(e) =>
                                  setRows((rs) =>
                                    rs.map((rr, idx) =>
                                      idx === i ? { ...rr, name: e.target.value } : rr,
                                    ),
                                  )
                                }
                                placeholder="Nome do item"
                                className="h-8 w-full border border-input bg-transparent px-2 text-xs"
                              />
                            )}
                          </td>
                          <td className="px-2 py-2">
                            <select
                              value={r.kind}
                              onChange={(e) =>
                                setRows((rs) =>
                                  rs.map((rr, idx) =>
                                    idx === i
                                      ? { ...rr, kind: e.target.value as OutputKind }
                                      : rr,
                                  ),
                                )
                              }
                              className="h-8 w-full border border-input bg-transparent px-2 text-xs"
                            >
                              {(["cut", "fat", "bone"] as OutputKind[]).map((k) => (
                                <option key={k} value={k}>
                                  {KIND_LABEL[k]}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-2 py-2 text-right">
                            <input
                              value={r.qty_real}
                              onChange={(e) =>
                                setRows((rs) =>
                                  rs.map((rr, idx) =>
                                    idx === i ? { ...rr, qty_real: e.target.value } : rr,
                                  ),
                                )
                              }
                              placeholder="0,000"
                              inputMode="decimal"
                              className="h-8 w-24 border border-input bg-transparent px-2 text-right text-xs"
                            />
                          </td>
                          <td className="px-2 py-2 text-right">
                            <input
                              value={r.qty_expected}
                              onChange={(e) =>
                                setRows((rs) =>
                                  rs.map((rr, idx) =>
                                    idx === i ? { ...rr, qty_expected: e.target.value } : rr,
                                  ),
                                )
                              }
                              placeholder="—"
                              inputMode="decimal"
                              className="h-8 w-24 border border-input bg-transparent px-2 text-right text-xs"
                            />
                          </td>
                          <td className="px-2 py-2 text-right">
                            <button
                              type="button"
                              onClick={() =>
                                setRows((rs) => rs.filter((_, idx) => idx !== i))
                              }
                              className="font-mono text-[10px] uppercase text-muted-foreground hover:text-destructive"
                            >
                              remover
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-5">
                <Kpi label="Bruto" value={`${totals.carcass.toFixed(2)} kg`} />
                <Kpi label="Cortes" value={`${totals.cut.toFixed(2)} kg`} />
                <Kpi label="Sebo + Osso" value={`${(totals.fat + totals.bone).toFixed(2)} kg`} />
                <Kpi label="Quebra" value={`${totals.loss.toFixed(2)} kg`} />
                <Kpi
                  label="Rend. real"
                  value={`${totals.yieldPct.toFixed(1)}%`}
                  hint={
                    totals.expected
                      ? `Δ ${(totals.yieldPct - totals.expected).toFixed(1)}pp vs previsto`
                      : undefined
                  }
                />
              </div>

              <div>
                <Label>Observações</Label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full border border-input bg-transparent p-2 text-sm"
                />
              </div>
            </div>

            <footer className="flex items-center justify-end gap-3 border-t border-border p-4">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-4 py-2 font-mono text-[10px] uppercase text-muted-foreground"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={save.isPending}
                onClick={() => save.mutate()}
                className="border border-primary bg-primary px-5 py-2 font-mono text-[10px] uppercase tracking-widest text-primary-foreground disabled:opacity-50"
              >
                {save.isPending ? "Salvando…" : "Registrar Desossa"}
              </button>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
      {children}
    </label>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="border border-border bg-white/5 p-3">
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-lg font-black tracking-tighter">{value}</div>
      {hint && <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">{hint}</div>}
    </div>
  );
}
