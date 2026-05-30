import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { DashboardTopbar } from "@/components/dashboard/Topbar";
import { formatBRL } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/pdv")({
  component: PdvPage,
  head: () => ({ meta: [{ title: "PDV · CarneOS" }] }),
});

type Product = {
  id: string;
  name: string;
  unit: "kg" | "un" | "g" | "l";
  price_cents: number;
  stock_qty: number;
};

type CartItem = {
  product_id: string;
  name: string;
  unit: Product["unit"];
  unit_price_cents: number;
  qty: number;
};

function PdvPage() {
  const { company } = useAuth();
  const qc = useQueryClient();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [payMethod, setPayMethod] = useState<"cash" | "credit" | "debit" | "pix">("pix");

  const { data: products = [] } = useQuery({
    queryKey: ["pdv-products", company?.id],
    enabled: !!company?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, unit, price_cents, stock_qty")
        .eq("company_id", company!.id)
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data as Product[];
    },
  });

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return products.filter((p) => p.name.toLowerCase().includes(s)).slice(0, 30);
  }, [products, search]);

  const total = cart.reduce((s, i) => s + i.qty * i.unit_price_cents, 0);

  const addToCart = (p: Product) => {
    setCart((c) => {
      const existing = c.find((i) => i.product_id === p.id);
      if (existing) {
        return c.map((i) =>
          i.product_id === p.id ? { ...i, qty: +(i.qty + 1).toFixed(3) } : i,
        );
      }
      return [
        ...c,
        {
          product_id: p.id,
          name: p.name,
          unit: p.unit,
          unit_price_cents: p.price_cents,
          qty: 1,
        },
      ];
    });
  };

  const updateQty = (idx: number, qty: number) =>
    setCart((c) => c.map((i, k) => (k === idx ? { ...i, qty } : i)));
  const remove = (idx: number) => setCart((c) => c.filter((_, k) => k !== idx));

  const checkout = useMutation({
    mutationFn: async () => {
      if (!company) throw new Error("Sem empresa");
      if (cart.length === 0) throw new Error("Carrinho vazio");
      const items = cart.map((i) => ({
        product_id: i.product_id,
        name: i.name,
        qty: i.qty,
        unit: i.unit,
        unit_price_cents: i.unit_price_cents,
        total_cents: Math.round(i.qty * i.unit_price_cents),
      }));
      const { data, error } = await supabase.rpc("register_sale", {
        _company_id: company.id,
        _client_uuid: crypto.randomUUID(),
        _terminal: "PDV-WEB",
        _customer_id: undefined as unknown as string,
        _pay_method: payMethod,
        _discount_cents: 0,
        _items: items,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: (saleId) => {
      toast.success("Venda registrada", { description: `Pedido ${saleId.slice(0, 8)}…` });
      setCart([]);
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      qc.invalidateQueries({ queryKey: ["pdv-products"] });
      qc.invalidateQueries({ queryKey: ["sales"] });
    },
    onError: (e: Error) => toast.error("Falha no checkout", { description: e.message }),
  });

  return (
    <>
      <DashboardTopbar title="PDV / Novo Pedido" />
      <main className="flex flex-1 overflow-hidden">
        {/* Catalog */}
        <section className="flex flex-1 flex-col overflow-hidden border-r border-border">
          <div className="border-b border-border bg-surface-2 p-4">
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar corte ou produto…"
              className="w-full border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-primary"
            />
          </div>
          <div className="grid flex-1 grid-cols-2 content-start gap-3 overflow-y-auto p-4 md:grid-cols-3 xl:grid-cols-4">
            {products.length === 0 && (
              <div className="col-span-full p-8 text-center font-mono text-xs text-muted-foreground">
                Cadastre produtos em{" "}
                <Link to="/products" className="text-primary underline">
                  Produtos / Cortes
                </Link>{" "}
                para começar a vender.
              </div>
            )}
            {filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => addToCart(p)}
                className="marbling-hover flex flex-col gap-2 border border-border bg-surface-2 p-4 text-left transition-all hover:border-primary"
              >
                <div className="text-sm font-bold uppercase tracking-tighter">{p.name}</div>
                <div className="font-mono text-[10px] uppercase text-muted-foreground">
                  Estoque {Number(p.stock_qty).toFixed(2)} {p.unit}
                </div>
                <div className="mt-auto font-mono text-primary">
                  {formatBRL(p.price_cents)} / {p.unit}
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Cart */}
        <aside className="flex w-96 shrink-0 flex-col bg-surface">
          <div className="border-b border-border p-4">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Carrinho ({cart.length})
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {cart.length === 0 && (
              <div className="p-8 text-center font-mono text-xs text-muted-foreground">
                Adicione produtos clicando à esquerda.
              </div>
            )}
            {cart.map((i, idx) => (
              <div key={idx} className="border-b border-border p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm font-bold uppercase tracking-tight">{i.name}</div>
                  <button
                    onClick={() => remove(idx)}
                    className="font-mono text-[10px] uppercase text-muted-foreground hover:text-warning"
                  >
                    ✕
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={i.qty}
                    onChange={(e) => updateQty(idx, Number(e.target.value))}
                    className="w-24 border border-border bg-background px-2 py-1 font-mono text-sm outline-none focus:border-primary"
                  />
                  <span className="font-mono text-[10px] uppercase text-muted-foreground">
                    × {formatBRL(i.unit_price_cents)} = 
                  </span>
                  <span className="font-mono text-primary">
                    {formatBRL(Math.round(i.qty * i.unit_price_cents))}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-3 border-t border-border p-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Total
              </span>
              <span className="text-2xl font-black tracking-tighter text-primary">
                {formatBRL(total)}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {(["cash", "credit", "debit", "pix"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setPayMethod(m)}
                  className={
                    "border px-2 py-2 font-mono text-[10px] uppercase tracking-widest " +
                    (payMethod === m
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-white/5")
                  }
                >
                  {m}
                </button>
              ))}
            </div>
            <button
              onClick={() => checkout.mutate()}
              disabled={checkout.isPending || cart.length === 0}
              className="w-full bg-primary px-4 py-3 font-mono text-xs font-bold uppercase tracking-widest text-primary-foreground hover:brightness-110 disabled:opacity-50"
            >
              {checkout.isPending ? "Processando…" : "Finalizar venda"}
            </button>
          </div>
        </aside>
      </main>
    </>
  );
}
