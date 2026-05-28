// Offline-first PDV queue. Uses localStorage for resilience without extra deps.
// Each pending sale carries a stable client_uuid for idempotent server-side dedupe.
import { supabase } from "@/integrations/supabase/client";

export type CartItem = {
  product_id: string | null;
  name: string;
  qty: number;
  unit: "kg" | "un";
  unit_price_cents: number;
  total_cents: number;
};

export type PendingSale = {
  client_uuid: string;
  company_id: string;
  terminal: string;
  customer_id: string | null;
  pay_method: "cash" | "debit" | "credit" | "pix" | "voucher";
  discount_cents: number;
  items: CartItem[];
  created_at: string;
  attempts: number;
  last_error?: string;
};

const KEY = "carneos.pdv.queue.v1";

export const queue = {
  list(): PendingSale[] {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem(KEY) || "[]") as PendingSale[];
    } catch {
      return [];
    }
  },
  save(items: PendingSale[]) {
    localStorage.setItem(KEY, JSON.stringify(items));
    window.dispatchEvent(new Event("pdv-queue-change"));
  },
  add(sale: PendingSale) {
    const all = queue.list();
    all.push(sale);
    queue.save(all);
  },
  remove(client_uuid: string) {
    queue.save(queue.list().filter((s) => s.client_uuid !== client_uuid));
  },
  update(client_uuid: string, patch: Partial<PendingSale>) {
    queue.save(queue.list().map((s) => (s.client_uuid === client_uuid ? { ...s, ...patch } : s)));
  },
};

export async function pushSale(sale: PendingSale): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.rpc("register_sale", {
    _company_id: sale.company_id,
    _client_uuid: sale.client_uuid,
    _terminal: sale.terminal,
    _customer_id: sale.customer_id as unknown as string,
    _pay_method: sale.pay_method,
    _discount_cents: sale.discount_cents,
    _items: sale.items as unknown as never,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}


export async function drainQueue() {
  const all = queue.list();
  for (const s of all) {
    const res = await pushSale(s);
    if (res.ok) queue.remove(s.client_uuid);
    else queue.update(s.client_uuid, { attempts: s.attempts + 1, last_error: res.error });
  }
}

export function isOnline() {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}
