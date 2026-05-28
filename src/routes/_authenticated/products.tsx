import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Topbar } from "@/components/dashboard/Topbar";
import { useCompany } from "@/hooks/use-company";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/products")({
  component: ProductsPage,
  head: () => ({ meta: [{ title: "Catálogo · CarneOS" }, { name: "robots", content: "noindex" }] }),
});

type Row = {
  id: string;
  name: string;
  category: string | null;
  unit: "kg" | "un";
  price_cents: number;
  cost_cents: number;
  stock_qty: number;
  min_stock: number;
  active: boolean;
  barcode: string | null;
};

function ProductsPage() {
  const { current } = useCompany();
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    category: "",
    unit: "kg" as "kg" | "un",
    price: "",
    cost: "",
    barcode: "",
    stock: "0",
  });

  const load = async () => {
    if (!current) return;
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("company_id", current.id)
      .order("name");
    setRows((data ?? []) as Row[]);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  const create = async () => {
    if (!current) return;
    if (!form.name || !form.price) return toast.error("Nome e preço obrigatórios");
    const { error } = await supabase.from("products").insert({
      company_id: current.id,
      name: form.name,
      category: form.category || null,
      unit: form.unit,
      price_cents: Math.round(parseFloat(form.price) * 100),
      cost_cents: Math.round(parseFloat(form.cost || "0") * 100),
      stock_qty: parseFloat(form.stock || "0"),
      barcode: form.barcode || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Produto criado");
    setOpen(false);
    setForm({ name: "", category: "", unit: "kg", price: "", cost: "", barcode: "", stock: "0" });
    load();
  };

  const toggle = async (r: Row) => {
    await supabase.from("products").update({ active: !r.active }).eq("id", r.id);
    load();
  };

  return (
    <>
      <Topbar section="Catálogo" />
      <main className="flex-1 space-y-6 overflow-y-auto p-6 lg:p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tighter">Catálogo de Cortes</h1>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {rows.length} SKU · multiempresa isolado por RLS
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="bg-primary px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-primary-foreground hover:brightness-110"
          >
            + Novo Produto
          </button>
        </div>

        <div className="border border-border bg-surface-2">
          <table className="w-full text-left">
            <thead className="border-b border-border font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Produto</th>
                <th className="px-4 py-3">Categoria</th>
                <th className="px-4 py-3 text-right">Custo</th>
                <th className="px-4 py-3 text-right">Preço</th>
                <th className="px-4 py-3 text-right">Margem</th>
                <th className="px-4 py-3 text-right">Estoque</th>
                <th className="px-4 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm">
              {rows.map((r) => {
                const margin =
                  r.price_cents > 0
                    ? ((r.price_cents - r.cost_cents) / r.price_cents) * 100
                    : 0;
                const low = Number(r.stock_qty) <= Number(r.min_stock);
                return (
                  <tr key={r.id} className="hover:bg-white/5">
                    <td className="px-4 py-3 font-bold uppercase tracking-tighter">{r.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.category ?? "—"}</td>
                    <td className="px-4 py-3 text-right font-mono">{brl(r.cost_cents)}</td>
                    <td className="px-4 py-3 text-right font-mono text-primary">
                      {brl(r.price_cents)}/{r.unit}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-success">
                      {margin.toFixed(1)}%
                    </td>
                    <td
                      className={
                        "px-4 py-3 text-right font-mono " +
                        (low ? "text-warning" : "text-muted-foreground")
                      }
                    >
                      {Number(r.stock_qty).toFixed(2)} {r.unit}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => toggle(r)}
                        className={
                          "border px-2 py-0.5 font-mono text-[10px] uppercase " +
                          (r.active
                            ? "border-success/40 text-success"
                            : "border-border text-muted-foreground")
                        }
                      >
                        {r.active ? "ativo" : "pausado"}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-muted-foreground">
                    Catálogo vazio. Use o PDV para popular o demo ou crie manualmente.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-xl border border-border bg-surface-2 p-6">
            <h3 className="text-xl font-black uppercase tracking-tighter">Novo produto</h3>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {[
                ["name", "Nome", "text"],
                ["category", "Categoria", "text"],
                ["barcode", "Cód. de barras", "text"],
                ["price", "Preço (R$)", "number"],
                ["cost", "Custo (R$)", "number"],
                ["stock", "Estoque inicial", "number"],
              ].map(([k, label, type]) => (
                <label key={k} className="block">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    {label}
                  </span>
                  <input
                    type={type}
                    step="0.01"
                    value={(form as Record<string, string>)[k]}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, [k]: e.target.value }) as typeof f)
                    }
                    className="mt-1 w-full border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-primary"
                  />
                </label>
              ))}
              <label className="col-span-2 block">
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Unidade
                </span>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  {(["kg", "un"] as const).map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, unit: u }))}
                      className={
                        "border py-2 font-mono text-xs uppercase " +
                        (form.unit === u
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border hover:bg-white/5")
                      }
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                className="border border-border px-4 py-2 font-mono text-[10px] uppercase tracking-widest hover:bg-white/5"
              >
                Cancelar
              </button>
              <button
                onClick={create}
                className="bg-primary px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-primary-foreground hover:brightness-110"
              >
                Criar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
