import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { DashboardTopbar } from "@/components/dashboard/Topbar";
import { Select } from "./products";

export const Route = createFileRoute("/_authenticated/inventory")({
  component: InventoryPage,
  head: () => ({ meta: [{ title: "Estoque · CarneOS" }] }),
});

type Product = { id: string; name: string; unit: string; stock_qty: number };
type Movement = {
  id: string;
  created_at: string;
  kind: "in" | "out" | "adjust" | "loss";
  qty: number;
  reason: string | null;
  lot: string | null;
  expires_at: string | null;
  product_id: string | null;
};

function InventoryPage() {
  const { company, user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: products = [] } = useQuery({
    queryKey: ["inv-products", company?.id],
    enabled: !!company?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, unit, stock_qty")
        .eq("company_id", company!.id)
        .order("name");
      if (error) throw error;
      return data as Product[];
    },
  });

  const { data: movements = [] } = useQuery({
    queryKey: ["movements", company?.id],
    enabled: !!company?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_movements")
        .select("*")
        .eq("company_id", company!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as Movement[];
    },
  });

  const productMap = new Map(products.map((p) => [p.id, p]));

  const save = useMutation({
    mutationFn: async (m: {
      product_id: string;
      kind: Movement["kind"];
      qty: number;
      reason: string;
      lot: string;
      expires_at: string;
    }) => {
      if (!company || !user) throw new Error("Sem sessão");
      // Insert movement
      const { error: mErr } = await supabase.from("stock_movements").insert({
        company_id: company.id,
        user_id: user.id,
        product_id: m.product_id,
        kind: m.kind,
        qty: m.qty,
        reason: m.reason || null,
        lot: m.lot || null,
        expires_at: m.expires_at || null,
      });
      if (mErr) throw mErr;

      // Update product stock
      const product = productMap.get(m.product_id);
      if (product) {
        const delta = m.kind === "in" ? m.qty : m.kind === "adjust" ? m.qty - Number(product.stock_qty) : -m.qty;
        const newStock = Number(product.stock_qty) + delta;
        const { error: pErr } = await supabase
          .from("products")
          .update({ stock_qty: newStock })
          .eq("id", m.product_id);
        if (pErr) throw pErr;
      }
    },
    onSuccess: () => {
      toast.success("Movimento registrado");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["movements"] });
      qc.invalidateQueries({ queryKey: ["inv-products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
    onError: (e: Error) => toast.error("Falha", { description: e.message }),
  });

  return (
    <>
      <DashboardTopbar
        title="Estoque & Movimentos"
        action={
          <button
            onClick={() => setOpen(true)}
            className="bg-primary px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-primary-foreground hover:brightness-110"
          >
            + Movimento
          </button>
        }
      />
      <main className="flex-1 space-y-6 overflow-y-auto p-6 lg:p-8">
        <section>
          <h3 className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Estoque atual
          </h3>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {products.map((p) => (
              <div key={p.id} className="border border-border bg-surface-2 p-4">
                <div className="text-sm font-bold uppercase tracking-tighter">{p.name}</div>
                <div className="mt-2 font-mono text-2xl text-primary">
                  {Number(p.stock_qty).toFixed(2)}
                </div>
                <div className="font-mono text-[10px] uppercase text-muted-foreground">{p.unit}</div>
              </div>
            ))}
            {products.length === 0 && (
              <div className="col-span-full p-6 text-center font-mono text-xs text-muted-foreground">
                Sem produtos cadastrados.
              </div>
            )}
          </div>
        </section>

        <section>
          <h3 className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Últimos movimentos
          </h3>
          <div className="border border-border">
            <table className="w-full text-left">
              <thead className="bg-surface-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Produto</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3 text-right">Qtd</th>
                  <th className="px-4 py-3">Lote</th>
                  <th className="px-4 py-3">Motivo</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {movements.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center font-mono text-xs text-muted-foreground">
                      Nenhum movimento registrado.
                    </td>
                  </tr>
                )}
                {movements.map((m) => (
                  <tr key={m.id} className="border-t border-border">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {new Date(m.created_at).toLocaleString("pt-BR")}
                    </td>
                    <td className="px-4 py-3 font-bold uppercase tracking-tight">
                      {m.product_id ? productMap.get(m.product_id)?.name ?? "—" : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <KindBadge kind={m.kind} />
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{Number(m.qty).toFixed(2)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{m.lot ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{m.reason ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {open && (
        <MovementDialog
          products={products}
          onClose={() => setOpen(false)}
          onSave={(v) => save.mutate(v)}
          saving={save.isPending}
        />
      )}
    </>
  );
}

function KindBadge({ kind }: { kind: Movement["kind"] }) {
  const map = {
    in: { label: "Entrada", cls: "border-success/40 text-success" },
    out: { label: "Saída", cls: "border-primary/40 text-primary" },
    adjust: { label: "Ajuste", cls: "border-border text-muted-foreground" },
    loss: { label: "Perda", cls: "border-warning/40 text-warning" },
  };
  const m = map[kind];
  return <span className={`border px-2 py-0.5 font-mono text-[10px] uppercase ${m.cls}`}>{m.label}</span>;
}

function MovementDialog({
  products,
  onClose,
  onSave,
  saving,
}: {
  products: Product[];
  onClose: () => void;
  onSave: (v: {
    product_id: string;
    kind: Movement["kind"];
    qty: number;
    reason: string;
    lot: string;
    expires_at: string;
  }) => void;
  saving: boolean;
}) {
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [kind, setKind] = useState<Movement["kind"]>("in");
  const [qty, setQty] = useState("0");
  const [reason, setReason] = useState("");
  const [lot, setLot] = useState("");
  const [expires, setExpires] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!productId) return toast.error("Selecione um produto");
          const q = Number(qty);
          if (!q || q <= 0) return toast.error("Quantidade inválida");
          onSave({ product_id: productId, kind, qty: q, reason, lot, expires_at: expires });
        }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg space-y-4 border border-border bg-background p-8"
      >
        <h2 className="text-xl font-black uppercase tracking-tighter">Novo movimento</h2>
        <Select
          label="Produto"
          value={productId}
          onChange={setProductId}
          options={products.map((p) => ({ value: p.id, label: p.name }))}
        />
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Tipo"
            value={kind}
            onChange={(v) => setKind(v as Movement["kind"])}
            options={[
              { value: "in", label: "Entrada" },
              { value: "out", label: "Saída" },
              { value: "adjust", label: "Ajuste" },
              { value: "loss", label: "Perda" },
            ]}
          />
          <label className="block">
            <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Quantidade
            </span>
            <input
              type="number"
              step="0.01"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="w-full border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Lote
            </span>
            <input
              value={lot}
              onChange={(e) => setLot(e.target.value)}
              className="w-full border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </label>
          <label className="block">
            <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Validade
            </span>
            <input
              type="date"
              value={expires}
              onChange={(e) => setExpires(e.target.value)}
              className="w-full border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </label>
        </div>
        <label className="block">
          <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Motivo
          </span>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Compra do frigorífico, perda por validade…"
            className="w-full border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </label>
        <div className="flex justify-end gap-2 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="border border-border px-4 py-2 font-mono text-[10px] uppercase tracking-widest hover:bg-white/5"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="bg-primary px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-primary-foreground hover:brightness-110 disabled:opacity-60"
          >
            {saving ? "Salvando…" : "Registrar"}
          </button>
        </div>
      </form>
    </div>
  );
}
