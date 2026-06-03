import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { DashboardTopbar } from "@/components/dashboard/Topbar";
import { Select } from "./products";
import { formatBRL, parseBRLInput } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/inventory")({
  component: InventoryPage,
  head: () => ({ meta: [{ title: "Estoque · Carne.CRM" }] }),
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
type DocType = "nfe" | "nfce" | "cupom" | "non_fiscal";
type Purchase = {
  id: string;
  created_at: string;
  received_at: string;
  doc_type: DocType;
  doc_number: string | null;
  supplier_name: string | null;
  total_cents: number;
};
type PurchaseItem = {
  product_id: string;
  name: string;
  qty: number;
  unit: "kg" | "un";
  unit_cost_cents: number;
  total_cents: number;
  lot: string;
  expires_at: string;
};

function InventoryPage() {
  const { company, user } = useAuth();
  const qc = useQueryClient();
  const [movOpen, setMovOpen] = useState(false);
  const [purOpen, setPurOpen] = useState(false);

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

  const { data: purchases = [] } = useQuery({
    queryKey: ["purchases", company?.id],
    enabled: !!company?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_invoices")
        .select("id, created_at, received_at, doc_type, doc_number, supplier_name, total_cents")
        .eq("company_id", company!.id)
        .order("received_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as Purchase[];
    },
  });

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

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

      const product = productMap.get(m.product_id);
      if (product) {
        const delta =
          m.kind === "in"
            ? m.qty
            : m.kind === "adjust"
            ? m.qty - Number(product.stock_qty)
            : -m.qty;
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
      setMovOpen(false);
      qc.invalidateQueries({ queryKey: ["movements"] });
      qc.invalidateQueries({ queryKey: ["inv-products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
    onError: (e: Error) => toast.error("Falha", { description: e.message }),
  });

  const savePurchase = useMutation({
    mutationFn: async (p: {
      doc_type: DocType;
      doc_number: string;
      doc_series: string;
      doc_key: string;
      supplier_name: string;
      supplier_doc: string;
      issued_at: string;
      notes: string;
      items: PurchaseItem[];
    }) => {
      if (!company) throw new Error("Sem empresa");
      if (p.items.length === 0) throw new Error("Adicione ao menos um item");
      const { data, error } = await supabase.rpc("register_purchase", {
        _company_id: company.id,
        _doc_type: p.doc_type,
        _doc_number: p.doc_number || null,
        _doc_series: p.doc_series || null,
        _doc_key: p.doc_key || null,
        _supplier_name: p.supplier_name || null,
        _supplier_doc: p.supplier_doc || null,
        _issued_at: p.issued_at || null,
        _notes: p.notes || null,
        _items: p.items.map((it) => ({
          product_id: it.product_id,
          name: it.name,
          qty: it.qty,
          unit: it.unit,
          unit_cost_cents: it.unit_cost_cents,
          total_cents: it.total_cents,
          lot: it.lot,
          expires_at: it.expires_at,
        })),
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Entrada registrada e estoque atualizado");
      setPurOpen(false);
      qc.invalidateQueries({ queryKey: ["purchases"] });
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
          <div className="flex gap-2">
            <button
              onClick={() => setPurOpen(true)}
              className="border border-primary bg-primary/10 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-primary hover:bg-primary/20"
            >
              + Entrada (NF / Cupom)
            </button>
            <button
              onClick={() => setMovOpen(true)}
              className="bg-primary px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-primary-foreground hover:brightness-110"
            >
              + Movimento
            </button>
          </div>
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
            Últimas entradas (notas / cupons)
          </h3>
          <div className="border border-border">
            <table className="w-full text-left">
              <thead className="bg-surface-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Documento</th>
                  <th className="px-4 py-3">Fornecedor</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {purchases.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center font-mono text-xs text-muted-foreground">
                      Nenhuma entrada registrada.
                    </td>
                  </tr>
                )}
                {purchases.map((p) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {new Date(p.received_at).toLocaleString("pt-BR")}
                    </td>
                    <td className="px-4 py-3"><DocBadge doc={p.doc_type} /></td>
                    <td className="px-4 py-3 font-mono text-xs">{p.doc_number ?? "—"}</td>
                    <td className="px-4 py-3 text-xs">{p.supplier_name ?? "—"}</td>
                    <td className="px-4 py-3 text-right font-mono">{formatBRL(p.total_cents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
                    <td className="px-4 py-3"><KindBadge kind={m.kind} /></td>
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

      {movOpen && (
        <MovementDialog
          products={products}
          onClose={() => setMovOpen(false)}
          onSave={(v) => save.mutate(v)}
          saving={save.isPending}
        />
      )}
      {purOpen && (
        <PurchaseDialog
          products={products}
          onClose={() => setPurOpen(false)}
          onSave={(v) => savePurchase.mutate(v)}
          saving={savePurchase.isPending}
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

function DocBadge({ doc }: { doc: DocType }) {
  const map: Record<DocType, { label: string; cls: string }> = {
    nfe: { label: "NF-e", cls: "border-success/40 text-success" },
    nfce: { label: "NFC-e", cls: "border-success/40 text-success" },
    cupom: { label: "Cupom Fiscal", cls: "border-primary/40 text-primary" },
    non_fiscal: { label: "Não Fiscal", cls: "border-warning/40 text-warning" },
  };
  const m = map[doc];
  return <span className={`border px-2 py-0.5 font-mono text-[10px] uppercase ${m.cls}`}>{m.label}</span>;
}

function MovementDialog({
  products, onClose, onSave, saving,
}: {
  products: Product[];
  onClose: () => void;
  onSave: (v: {
    product_id: string; kind: Movement["kind"]; qty: number;
    reason: string; lot: string; expires_at: string;
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
        <Select label="Produto" value={productId} onChange={setProductId} options={products.map((p) => ({ value: p.id, label: p.name }))} />
        <div className="grid grid-cols-2 gap-3">
          <Select label="Tipo" value={kind} onChange={(v) => setKind(v as Movement["kind"])} options={[
            { value: "in", label: "Entrada" }, { value: "out", label: "Saída" },
            { value: "adjust", label: "Ajuste" }, { value: "loss", label: "Perda" },
          ]} />
          <label className="block">
            <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Quantidade</span>
            <input type="number" step="0.01" value={qty} onChange={(e) => setQty(e.target.value)} className={fieldCls} />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Lote</span>
            <input value={lot} onChange={(e) => setLot(e.target.value)} className={fieldCls} />
          </label>
          <label className="block">
            <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Validade</span>
            <input type="date" value={expires} onChange={(e) => setExpires(e.target.value)} className={fieldCls} />
          </label>
        </div>
        <label className="block">
          <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Motivo</span>
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ajuste manual, perda…" className={fieldCls} />
        </label>
        <div className="flex justify-end gap-2 pt-4">
          <button type="button" onClick={onClose} className="border border-border px-4 py-2 font-mono text-[10px] uppercase tracking-widest hover:bg-white/5">Cancelar</button>
          <button type="submit" disabled={saving} className="bg-primary px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-primary-foreground hover:brightness-110 disabled:opacity-60">
            {saving ? "Salvando…" : "Registrar"}
          </button>
        </div>
      </form>
    </div>
  );
}

function PurchaseDialog({
  products, onClose, onSave, saving,
}: {
  products: Product[];
  onClose: () => void;
  onSave: (v: {
    doc_type: DocType; doc_number: string; doc_series: string; doc_key: string;
    supplier_name: string; supplier_doc: string; issued_at: string; notes: string;
    items: PurchaseItem[];
  }) => void;
  saving: boolean;
}) {
  const [docType, setDocType] = useState<DocType>("nfe");
  const [docNumber, setDocNumber] = useState("");
  const [docSeries, setDocSeries] = useState("");
  const [docKey, setDocKey] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [supplierDoc, setSupplierDoc] = useState("");
  const [issuedAt, setIssuedAt] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<PurchaseItem[]>([]);

  const addItem = () => {
    const first = products[0];
    if (!first) { toast.error("Cadastre um produto primeiro"); return; }
    setItems((arr) => [
      ...arr,
      {
        product_id: first.id,
        name: first.name,
        qty: 0,
        unit: (first.unit as "kg" | "un") ?? "kg",
        unit_cost_cents: 0,
        total_cents: 0,
        lot: "",
        expires_at: "",
      },
    ]);
  };

  const updateItem = (idx: number, patch: Partial<PurchaseItem>) => {
    setItems((arr) =>
      arr.map((it, i) => {
        if (i !== idx) return it;
        const next = { ...it, ...patch };
        if (patch.product_id) {
          const p = products.find((p) => p.id === patch.product_id);
          if (p) {
            next.name = p.name;
            next.unit = (p.unit as "kg" | "un") ?? "kg";
          }
        }
        next.total_cents = Math.round(next.qty * next.unit_cost_cents);
        return next;
      }),
    );
  };

  const removeItem = (idx: number) => setItems((arr) => arr.filter((_, i) => i !== idx));

  const grandTotal = items.reduce((s, it) => s + it.total_cents, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (items.length === 0) return toast.error("Adicione itens");
          if (items.some((it) => it.qty <= 0)) return toast.error("Quantidade inválida em algum item");
          onSave({
            doc_type: docType,
            doc_number: docNumber, doc_series: docSeries, doc_key: docKey,
            supplier_name: supplierName, supplier_doc: supplierDoc,
            issued_at: issuedAt, notes, items,
          });
        }}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-4xl space-y-4 overflow-y-auto border border-border bg-background p-8"
      >
        <h2 className="text-xl font-black uppercase tracking-tighter">Entrada de produtos</h2>
        <p className="text-xs text-muted-foreground">
          Registre a entrada via Nota Fiscal eletrônica, NFC-e, Cupom Fiscal ou Não Fiscal. O estoque será atualizado automaticamente.
        </p>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Select label="Tipo do documento" value={docType} onChange={(v) => setDocType(v as DocType)} options={[
            { value: "nfe", label: "NF-e (55)" },
            { value: "nfce", label: "NFC-e (65)" },
            { value: "cupom", label: "Cupom Fiscal" },
            { value: "non_fiscal", label: "Não Fiscal" },
          ]} />
          <label className="block">
            <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Número</span>
            <input value={docNumber} onChange={(e) => setDocNumber(e.target.value)} className={fieldCls} />
          </label>
          <label className="block">
            <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Série</span>
            <input value={docSeries} onChange={(e) => setDocSeries(e.target.value)} className={fieldCls} />
          </label>
          <label className="block">
            <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Emissão</span>
            <input type="date" value={issuedAt} onChange={(e) => setIssuedAt(e.target.value)} className={fieldCls} />
          </label>
        </div>

        {(docType === "nfe" || docType === "nfce") && (
          <label className="block">
            <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Chave de acesso (44 dígitos)</span>
            <input value={docKey} onChange={(e) => setDocKey(e.target.value.replace(/\D/g, "").slice(0, 44))} className={fieldCls} placeholder="0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000" />
          </label>
        )}

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Fornecedor</span>
            <input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} className={fieldCls} placeholder="Razão social" />
          </label>
          <label className="block">
            <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">CNPJ / CPF do fornecedor</span>
            <input value={supplierDoc} onChange={(e) => setSupplierDoc(e.target.value)} className={fieldCls} />
          </label>
        </div>

        <div className="border border-border">
          <div className="flex items-center justify-between border-b border-border bg-surface-2 px-3 py-2">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Itens</span>
            <button type="button" onClick={addItem} className="font-mono text-[10px] uppercase tracking-widest text-primary hover:underline">
              + Adicionar item
            </button>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-2/50 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-2 py-2">Produto</th>
                <th className="px-2 py-2 text-right">Qtd</th>
                <th className="px-2 py-2 text-right">Custo unit.</th>
                <th className="px-2 py-2 text-right">Total</th>
                <th className="px-2 py-2">Lote</th>
                <th className="px-2 py-2">Validade</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr><td colSpan={7} className="px-2 py-6 text-center font-mono text-xs text-muted-foreground">Nenhum item adicionado.</td></tr>
              )}
              {items.map((it, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="px-2 py-1">
                    <select value={it.product_id} onChange={(e) => updateItem(i, { product_id: e.target.value })} className={fieldCls}>
                      {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-1 text-right">
                    <input type="number" step="0.001" min={0} value={it.qty} onChange={(e) => updateItem(i, { qty: Number(e.target.value) || 0 })} className={`${fieldCls} text-right`} />
                  </td>
                  <td className="px-2 py-1 text-right">
                    <input
                      value={formatBRL(it.unit_cost_cents)}
                      onChange={(e) => updateItem(i, { unit_cost_cents: parseBRLInput(e.target.value) })}
                      className={`${fieldCls} text-right`}
                    />
                  </td>
                  <td className="px-2 py-1 text-right font-mono">{formatBRL(it.total_cents)}</td>
                  <td className="px-2 py-1"><input value={it.lot} onChange={(e) => updateItem(i, { lot: e.target.value })} className={fieldCls} /></td>
                  <td className="px-2 py-1"><input type="date" value={it.expires_at} onChange={(e) => updateItem(i, { expires_at: e.target.value })} className={fieldCls} /></td>
                  <td className="px-2 py-1 text-right">
                    <button type="button" onClick={() => removeItem(i)} className="font-mono text-[10px] uppercase text-muted-foreground hover:text-warning">×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-end border-t border-border bg-surface-2 px-3 py-2 font-mono text-sm">
            Total: <span className="ml-3 text-primary">{formatBRL(grandTotal)}</span>
          </div>
        </div>

        <label className="block">
          <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Observações</span>
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={fieldCls} />
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="border border-border px-4 py-2 font-mono text-[10px] uppercase tracking-widest hover:bg-white/5">Cancelar</button>
          <button type="submit" disabled={saving} className="bg-primary px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-primary-foreground hover:brightness-110 disabled:opacity-60">
            {saving ? "Salvando…" : "Registrar entrada"}
          </button>
        </div>
      </form>
    </div>
  );
}

const fieldCls = "w-full border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary";
