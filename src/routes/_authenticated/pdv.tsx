import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Topbar } from "@/components/dashboard/Topbar";
import { useCompany } from "@/hooks/use-company";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/format";
import {
  drainQueue,
  pushSale,
  queue,
  type CartItem,
  type PendingSale,
} from "@/lib/pdv-offline";

export const Route = createFileRoute("/_authenticated/pdv")({
  component: PdvPage,
  head: () => ({ meta: [{ title: "PDV · CarneOS" }, { name: "robots", content: "noindex" }] }),
});

type Product = {
  id: string;
  name: string;
  unit: "kg" | "un";
  price_cents: number;
  barcode: string | null;
  category: string | null;
  stock_qty: number;
};

const PAYS: Array<{ k: PendingSale["pay_method"]; label: string; hint: string }> = [
  { k: "cash", label: "Dinheiro", hint: "F1" },
  { k: "debit", label: "Débito", hint: "F2" },
  { k: "credit", label: "Crédito", hint: "F3" },
  { k: "pix", label: "PIX", hint: "F4" },
  { k: "voucher", label: "Voucher", hint: "F5" },
];

function uuid() {
  return (globalThis.crypto?.randomUUID?.() ??
    "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    })) as string;
}

function PdvPage() {
  const { current } = useCompany();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [weight, setWeight] = useState(""); // kg or un input
  const [scale, setScale] = useState<number>(0); // simulated scale reading
  const [pay, setPay] = useState<PendingSale["pay_method"]>("cash");
  const [discount, setDiscount] = useState(0);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    if (!current) return;
    (async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, unit, price_cents, barcode, category, stock_qty")
        .eq("company_id", current.id)
        .eq("active", true)
        .order("name");
      setProducts((data ?? []) as Product[]);
    })();
  }, [current]);

  // Simulated scale tick (premium feel — replace by real serial bridge later)
  useEffect(() => {
    const id = setInterval(() => {
      setScale((s) => {
        const target = Number(weight) || 0;
        const noise = (Math.random() - 0.5) * 0.004;
        return Math.max(0, target ? target + noise : Math.max(0, s + noise));
      });
    }, 350);
    return () => clearInterval(id);
  }, [weight]);

  // Sync pending count
  useEffect(() => {
    const upd = () => setPending(queue.list().length);
    upd();
    window.addEventListener("pdv-queue-change", upd);
    return () => window.removeEventListener("pdv-queue-change", upd);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products.slice(0, 18);
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.barcode ?? "").toLowerCase().includes(q) ||
          (p.category ?? "").toLowerCase().includes(q),
      )
      .slice(0, 18);
  }, [products, search]);

  const subtotal = cart.reduce((a, b) => a + b.total_cents, 0);
  const total = Math.max(0, subtotal - discount);

  const addToCart = (p: Product) => {
    const qty = Number(weight) || (p.unit === "un" ? 1 : 0);
    if (!qty) {
      toast.error("Informe o peso/qtd primeiro");
      return;
    }
    const totalCents = Math.round(qty * p.price_cents);
    setCart((c) => [
      ...c,
      {
        product_id: p.id,
        name: p.name,
        qty,
        unit: p.unit,
        unit_price_cents: p.price_cents,
        total_cents: totalCents,
      },
    ]);
    setWeight("");
  };

  const remove = (i: number) => setCart((c) => c.filter((_, idx) => idx !== i));

  const finalize = async () => {
    if (!current) return toast.error("Selecione uma empresa");
    if (cart.length === 0) return toast.error("Carrinho vazio");
    const sale: PendingSale = {
      client_uuid: uuid(),
      company_id: current.id,
      terminal: "PDV-01",
      customer_id: null,
      pay_method: pay,
      discount_cents: discount,
      items: cart,
      created_at: new Date().toISOString(),
      attempts: 0,
    };
    if (!navigator.onLine) {
      queue.add(sale);
      toast.success(`Venda enfileirada offline · ${brl(total)}`);
      setCart([]);
      setDiscount(0);
      return;
    }
    const res = await pushSale(sale);
    if (res.ok) {
      toast.success(`Venda registrada · ${brl(total)}`);
      setCart([]);
      setDiscount(0);
      // refresh stock
      const { data } = await supabase
        .from("products")
        .select("id, name, unit, price_cents, barcode, category, stock_qty")
        .eq("company_id", current.id)
        .eq("active", true)
        .order("name");
      setProducts((data ?? []) as Product[]);
    } else {
      queue.add(sale);
      toast.error(`Erro: ${res.error} · venda em fila offline`);
      setCart([]);
    }
  };

  const seed = async () => {
    if (!current) return;
    const seedData = [
      { name: "Picanha Maturada 21d", unit: "kg" as const, price_cents: 12990, category: "Bovinos Premium" },
      { name: "Ancho Black Angus", unit: "kg" as const, price_cents: 18990, category: "Bovinos Premium" },
      { name: "Prime Rib Wagyu A5", unit: "kg" as const, price_cents: 49900, category: "Wagyu" },
      { name: "Filé Mignon", unit: "kg" as const, price_cents: 13900, category: "Bovinos" },
      { name: "Costela Bovina", unit: "kg" as const, price_cents: 6490, category: "Bovinos" },
      { name: "Linguiça Toscana Artesanal", unit: "kg" as const, price_cents: 4990, category: "Embutidos" },
      { name: "Chorizo Argentino", unit: "kg" as const, price_cents: 7990, category: "Embutidos" },
      { name: "Bacon em Manta", unit: "kg" as const, price_cents: 5990, category: "Defumados" },
      { name: "Frango Caipira (un)", unit: "un" as const, price_cents: 4290, category: "Aves" },
    ];
    const rows = seedData.map((d) => ({
      ...d,
      company_id: current.id,
      stock_qty: 50,
      cost_cents: Math.round(d.price_cents * 0.55),
    }));
    const { error } = await supabase.from("products").insert(rows);
    if (error) return toast.error(error.message);
    toast.success("Catálogo inicial criado");
    const { data } = await supabase
      .from("products")
      .select("id, name, unit, price_cents, barcode, category, stock_qty")
      .eq("company_id", current.id)
      .eq("active", true)
      .order("name");
    setProducts((data ?? []) as Product[]);
  };

  return (
    <>
      <Topbar section="PDV Live" />
      <main className="grid flex-1 grid-cols-1 gap-px overflow-hidden bg-border xl:grid-cols-[1fr_440px]">
        {/* LEFT: catalog + scale */}
        <section className="flex flex-col bg-background">
          <div className="grid grid-cols-[1fr_220px_220px] gap-px bg-border">
            <div className="bg-surface-2 p-5">
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Buscar produto / código de barras
              </div>
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Picanha, 7891… , F2 débito"
                className="mt-2 w-full border-b-2 border-primary/40 bg-transparent py-2 text-2xl font-black tracking-tighter outline-none focus:border-primary"
              />
            </div>
            <div className="bg-surface-2 p-5">
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Balança (kg)
              </div>
              <div className="mt-2 font-mono text-3xl font-black tabular-nums text-primary">
                {scale.toFixed(3)}
              </div>
              <div className="font-mono text-[10px] text-muted-foreground">
                <span className="mr-1 inline-block size-1.5 animate-pulse rounded-full bg-success" />
                emulada · pronta p/ serial
              </div>
            </div>
            <div className="bg-surface-2 p-5">
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Peso / Qtd
              </div>
              <input
                value={weight}
                onChange={(e) => setWeight(e.target.value.replace(",", "."))}
                inputMode="decimal"
                placeholder="0.000"
                className="mt-2 w-full bg-transparent font-mono text-3xl font-black tabular-nums outline-none"
              />
              <button
                type="button"
                onClick={() => setWeight(scale.toFixed(3))}
                className="mt-1 font-mono text-[10px] uppercase tracking-widest text-primary hover:underline"
              >
                ↓ usar balança
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-px overflow-y-auto bg-border md:grid-cols-3 xl:grid-cols-4">
            {products.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center gap-3 bg-surface-2 p-12 text-center">
                <p className="text-sm text-muted-foreground">
                  Nenhum produto cadastrado para esta empresa.
                </p>
                <button
                  onClick={seed}
                  type="button"
                  className="border border-primary bg-primary/10 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-primary hover:bg-primary hover:text-primary-foreground"
                >
                  + Popular catálogo demo
                </button>
              </div>
            )}
            {filtered.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => addToCart(p)}
                className="marbling-hover flex flex-col gap-2 bg-surface-2 p-4 text-left transition-all hover:bg-primary/10"
              >
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  {p.category ?? "—"}
                </div>
                <div className="text-sm font-bold uppercase tracking-tighter">{p.name}</div>
                <div className="mt-auto flex items-end justify-between">
                  <div className="font-mono text-[10px] text-muted-foreground">
                    Estoque {Number(p.stock_qty).toFixed(2)} {p.unit}
                  </div>
                  <div className="font-mono text-base font-black text-primary">
                    {brl(p.price_cents)}
                    <span className="ml-1 text-[10px] text-muted-foreground">/{p.unit}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* RIGHT: cart */}
        <aside className="flex flex-col bg-surface-2">
          <div className="flex items-center justify-between border-b border-border p-5">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Venda atual · {cart.length} item{cart.length === 1 ? "" : "s"}
              </div>
              <div className="mt-1 font-mono text-[10px] text-muted-foreground">
                Terminal PDV-01 · fila {pending}
              </div>
            </div>
            <button
              type="button"
              onClick={() => drainQueue()}
              className="border border-border px-3 py-1 font-mono text-[10px] uppercase tracking-widest hover:bg-white/5"
            >
              ↻ sync
            </button>
          </div>

          <div className="flex-1 divide-y divide-border overflow-y-auto">
            {cart.length === 0 && (
              <div className="p-8 text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Aguardando bipagem / leitura de balança
              </div>
            )}
            {cart.map((it, i) => (
              <div key={i} className="grid grid-cols-[1fr_auto] gap-2 p-4 hover:bg-white/5">
                <div>
                  <div className="text-sm font-bold uppercase tracking-tighter">{it.name}</div>
                  <div className="font-mono text-[10px] text-muted-foreground">
                    {Number(it.qty).toFixed(3)} {it.unit} × {brl(it.unit_price_cents)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-base font-bold text-primary">
                    {brl(it.total_cents)}
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-destructive"
                  >
                    remover
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-border p-5 space-y-4">
            <div className="grid grid-cols-5 gap-1">
              {PAYS.map((p) => (
                <button
                  key={p.k}
                  type="button"
                  onClick={() => setPay(p.k)}
                  className={
                    "flex flex-col items-center gap-1 border p-2 font-mono text-[10px] uppercase tracking-widest transition-colors " +
                    (pay === p.k
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:bg-white/5")
                  }
                >
                  <span>{p.label}</span>
                  <span className="text-[9px] opacity-60">{p.hint}</span>
                </button>
              ))}
            </div>

            <div className="space-y-1 font-mono text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>{brl(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Desconto</span>
                <input
                  value={(discount / 100).toString()}
                  onChange={(e) =>
                    setDiscount(Math.max(0, Math.round(parseFloat(e.target.value || "0") * 100)))
                  }
                  inputMode="decimal"
                  className="w-24 border border-border bg-background px-2 py-1 text-right tabular-nums outline-none focus:border-primary"
                />
              </div>
              <div className="flex items-baseline justify-between border-t border-border pt-3 text-2xl">
                <span className="font-bold uppercase tracking-tighter">Total</span>
                <span className="text-4xl font-black tabular-nums text-primary">{brl(total)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={finalize}
              disabled={cart.length === 0}
              className="block w-full bg-primary py-4 text-center font-mono text-sm font-bold uppercase tracking-widest text-primary-foreground transition-all hover:brightness-110 disabled:opacity-40"
            >
              ▶ Finalizar venda · {brl(total)}
            </button>
          </div>
        </aside>
      </main>
    </>
  );
}
