import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Topbar } from "@/components/dashboard/Topbar";
import { useCompany } from "@/hooks/use-company";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/crm")({
  component: CrmPage,
  head: () => ({ meta: [{ title: "CRM · CarneOS" }, { name: "robots", content: "noindex" }] }),
});

type Customer = {
  id: string;
  name: string;
  doc: string | null;
  phone: string | null;
  email: string | null;
  credit_limit_cents: number;
  created_at: string;
};

function CrmPage() {
  const { current } = useCompany();
  const [rows, setRows] = useState<Customer[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", doc: "", phone: "", email: "", credit: "0" });

  const load = async () => {
    if (!current) return;
    const { data } = await supabase
      .from("customers")
      .select("*")
      .eq("company_id", current.id)
      .order("name");
    setRows((data ?? []) as Customer[]);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  const create = async () => {
    if (!current) return;
    if (!form.name) return toast.error("Nome obrigatório");
    const { error } = await supabase.from("customers").insert({
      company_id: current.id,
      name: form.name,
      doc: form.doc || null,
      phone: form.phone || null,
      email: form.email || null,
      credit_limit_cents: Math.round(parseFloat(form.credit || "0") * 100),
    });
    if (error) return toast.error(error.message);
    toast.success("Cliente criado");
    setOpen(false);
    setForm({ name: "", doc: "", phone: "", email: "", credit: "0" });
    load();
  };

  return (
    <>
      <Topbar section="CRM" />
      <main className="flex-1 space-y-6 overflow-y-auto p-6 lg:p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tighter">Clientes Premium</h1>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {rows.length} cliente{rows.length === 1 ? "" : "s"} · crédito, recorrência, churn
            </p>
          </div>
          <button
            onClick={() => setOpen(true)}
            className="bg-primary px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-primary-foreground hover:brightness-110"
          >
            + Novo Cliente
          </button>
        </div>

        <div className="border border-border bg-surface-2">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Documento</th>
                <th className="px-4 py-3">Telefone</th>
                <th className="px-4 py-3">E-mail</th>
                <th className="px-4 py-3 text-right">Limite</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((c) => (
                <tr key={c.id} className="hover:bg-white/5">
                  <td className="px-4 py-3 font-bold uppercase tracking-tighter">{c.name}</td>
                  <td className="px-4 py-3 font-mono text-muted-foreground">{c.doc ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-muted-foreground">{c.phone ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-muted-foreground">{c.email ?? "—"}</td>
                  <td className="px-4 py-3 text-right font-mono text-primary">
                    {brl(c.credit_limit_cents)}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-muted-foreground">
                    Nenhum cliente cadastrado.
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
            <h3 className="text-xl font-black uppercase tracking-tighter">Novo cliente</h3>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {([
                ["name", "Nome", "text"],
                ["doc", "CPF/CNPJ", "text"],
                ["phone", "Telefone", "text"],
                ["email", "E-mail", "email"],
                ["credit", "Limite crédito (R$)", "number"],
              ] as const).map(([k, label, type]) => (
                <label key={k} className="block">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    {label}
                  </span>
                  <input
                    type={type}
                    value={form[k]}
                    onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
                    className="mt-1 w-full border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-primary"
                  />
                </label>
              ))}
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
