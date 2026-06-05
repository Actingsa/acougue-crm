import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { DashboardTopbar } from "@/components/dashboard/Topbar";
import { formatBRL, parseBRLInput } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/products")({
  component: ProductsPage,
  head: () => ({ meta: [{ title: "Produtos · Carne.CRM" }] }),
});

type Product = {
  id: string;
  name: string;
  category: string | null;
  unit: "kg" | "un";
  price_cents: number;
  cost_cents: number;
  stock_qty: number;
  min_stock: number;
  active: boolean;
  sku: string | null;
  barcode: string | null;
  plu_code: string | null;
  is_weighable: boolean;
  tare_grams: number;
  package_grams: number | null;
  scale_prefix: string | null;
};

function ProductsPage() {
  const { company } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  const { data: products = [] } = useQuery({
    queryKey: ["products", company?.id],
    enabled: !!company?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("company_id", company!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Product[];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Produto removido");
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e: Error) => toast.error("Erro ao remover", { description: e.message }),
  });

  return (
    <>
      <DashboardTopbar
        title="Produtos / Cortes"
        action={
          <button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
            className="bg-primary px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-primary-foreground hover:brightness-110"
          >
            + Novo Produto
          </button>
        }
      />
      <main className="flex-1 overflow-y-auto p-6 lg:p-8">
        <div className="border border-border">
          <table className="w-full text-left">
            <thead className="bg-surface-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Categoria</th>
                <th className="px-4 py-3 text-right">Preço</th>
                <th className="px-4 py-3 text-right">Custo</th>
                <th className="px-4 py-3 text-right">Estoque</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {products.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center font-mono text-xs text-muted-foreground">
                    Nenhum produto cadastrado. Clique em "+ Novo Produto".
                  </td>
                </tr>
              )}
              {products.map((p) => (
                <tr key={p.id} className="border-t border-border hover:bg-white/5">
                  <td className="px-4 py-3 font-bold uppercase tracking-tight">{p.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.category ?? "—"}</td>
                  <td className="px-4 py-3 text-right font-mono text-primary">
                    {formatBRL(p.price_cents)} / {p.unit}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                    {formatBRL(p.cost_cents)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {Number(p.stock_qty).toFixed(2)} {p.unit}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => {
                        setEditing(p);
                        setOpen(true);
                      }}
                      className="mr-2 font-mono text-[10px] uppercase tracking-widest text-primary hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Remover "${p.name}"?`)) del.mutate(p.id);
                      }}
                      className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-warning"
                    >
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {open && (
        <ProductDialog
          product={editing}
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false);
            qc.invalidateQueries({ queryKey: ["products"] });
          }}
        />
      )}
    </>
  );
}

function ProductDialog({
  product,
  onClose,
  onSaved,
}: {
  product: Product | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { company } = useAuth();
  const [name, setName] = useState(product?.name ?? "");
  const [category, setCategory] = useState(product?.category ?? "");
  const [unit, setUnit] = useState<Product["unit"]>(product?.unit ?? "kg");
  const [price, setPrice] = useState(product ? formatBRL(product.price_cents) : "");
  const [cost, setCost] = useState(product ? formatBRL(product.cost_cents) : "");
  const [stock, setStock] = useState(product ? String(product.stock_qty) : "0");
  const [minStock, setMinStock] = useState(product ? String(product.min_stock) : "0");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;
    setLoading(true);
    try {
      const payload = {
        company_id: company.id,
        name: name.trim(),
        category: category.trim() || null,
        unit,
        price_cents: parseBRLInput(price),
        cost_cents: parseBRLInput(cost),
        stock_qty: Number(stock) || 0,
        min_stock: Number(minStock) || 0,
      };
      if (product) {
        const { error } = await supabase.from("products").update(payload).eq("id", product.id);
        if (error) throw error;
        toast.success("Produto atualizado");
      } else {
        const { error } = await supabase.from("products").insert(payload);
        if (error) throw error;
        toast.success("Produto cadastrado");
      }
      onSaved();
    } catch (err) {
      toast.error("Falha ao salvar", { description: err instanceof Error ? err.message : "" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <form
        onSubmit={onSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg space-y-4 border border-border bg-background p-8"
      >
        <h2 className="text-xl font-black uppercase tracking-tighter">
          {product ? "Editar produto" : "Novo produto"}
        </h2>
        <Input label="Nome" value={name} onChange={setName} required autoFocus />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Categoria" value={category} onChange={setCategory} />
          <Select
            label="Unidade"
            value={unit}
            onChange={(v) => setUnit(v as Product["unit"])}
            options={[
              { value: "kg", label: "kg" },
              { value: "un", label: "un" },
            ]}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Preço de venda" value={price} onChange={setPrice} placeholder="R$ 0,00" />
          <Input label="Custo" value={cost} onChange={setCost} placeholder="R$ 0,00" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Estoque atual" value={stock} onChange={setStock} type="number" />
          <Input label="Estoque mínimo" value={minStock} onChange={setMinStock} type="number" />
        </div>
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
            disabled={loading}
            className="bg-primary px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-primary-foreground hover:brightness-110 disabled:opacity-60"
          >
            {loading ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function Input({
  label,
  value,
  onChange,
  ...rest
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value">) {
  return (
    <label className="block">
      <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <input
        {...rest}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
      />
    </label>
  );
}

export function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
