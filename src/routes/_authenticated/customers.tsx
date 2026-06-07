import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { DashboardTopbar } from "@/components/dashboard/Topbar";
import { Input } from "./products";
import { useCepLookup } from "@/lib/cep";

export const Route = createFileRoute("/_authenticated/customers")({
  component: CustomersPage,
  head: () => ({ meta: [{ title: "Clientes · Carne.CRM" }] }),
});

type Customer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  doc: string | null;
  notes: string | null;
  address_zip: string | null;
  address_street: string | null;
  address_number: string | null;
  address_complement: string | null;
  address_district: string | null;
  address_city: string | null;
  address_state: string | null;
};

function CustomersPage() {
  const { company } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);

  const { data: customers = [] } = useQuery({
    queryKey: ["customers", company?.id],
    enabled: !!company?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("company_id", company!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Customer[];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("customers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cliente removido");
      qc.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });

  return (
    <>
      <DashboardTopbar
        title="Clientes"
        action={
          <button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
            className="bg-primary px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-primary-foreground hover:brightness-110"
          >
            + Novo Cliente
          </button>
        }
      />
      <main className="flex-1 overflow-y-auto p-6 lg:p-8">
        <div className="border border-border">
          <table className="w-full text-left">
            <thead className="bg-surface-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">CPF / CNPJ</th>
                <th className="px-4 py-3">Contato</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {customers.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center font-mono text-xs text-muted-foreground">
                    Nenhum cliente cadastrado.
                  </td>
                </tr>
              )}
              {customers.map((c) => (
                <tr key={c.id} className="border-t border-border hover:bg-white/5">
                  <td className="px-4 py-3 font-bold uppercase tracking-tight">{c.name}</td>
                  <td className="px-4 py-3 font-mono text-muted-foreground">{c.doc ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {c.email ?? c.phone ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => {
                        setEditing(c);
                        setOpen(true);
                      }}
                      className="mr-2 font-mono text-[10px] uppercase tracking-widest text-primary hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Remover "${c.name}"?`)) del.mutate(c.id);
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
        <CustomerDialog
          customer={editing}
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false);
            qc.invalidateQueries({ queryKey: ["customers"] });
          }}
        />
      )}
    </>
  );
}

function CustomerDialog({
  customer,
  onClose,
  onSaved,
}: {
  customer: Customer | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { company } = useAuth();
  const [name, setName] = useState(customer?.name ?? "");
  const [doc, setDoc] = useState(customer?.doc ?? "");
  const [email, setEmail] = useState(customer?.email ?? "");
  const [phone, setPhone] = useState(customer?.phone ?? "");
  const [notes, setNotes] = useState(customer?.notes ?? "");
  const [zip, setZip] = useState(customer?.address_zip ?? "");
  const [street, setStreet] = useState(customer?.address_street ?? "");
  const [number, setNumber] = useState(customer?.address_number ?? "");
  const [complement, setComplement] = useState(customer?.address_complement ?? "");
  const [district, setDistrict] = useState(customer?.address_district ?? "");
  const [city, setCity] = useState(customer?.address_city ?? "");
  const [stateUf, setStateUf] = useState(customer?.address_state ?? "");
  const [loading, setLoading] = useState(false);

  const cep = useCepLookup(
    { setStreet, setDistrict, setCity, setState: setStateUf },
    setZip,
  );

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;
    setLoading(true);
    try {
      const payload = {
        company_id: company.id,
        name: name.trim(),
        doc: doc.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        notes: notes.trim() || null,
        address_zip: zip.trim() || null,
        address_street: street.trim() || null,
        address_number: number.trim() || null,
        address_complement: complement.trim() || null,
        address_district: district.trim() || null,
        address_city: city.trim() || null,
        address_state: stateUf.trim().toUpperCase().slice(0, 2) || null,
      };
      if (customer) {
        const { error } = await supabase.from("customers").update(payload).eq("id", customer.id);
        if (error) throw error;
        toast.success("Cliente atualizado");
      } else {
        const { error } = await supabase.from("customers").insert(payload);
        if (error) throw error;
        toast.success("Cliente cadastrado");
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
        className="max-h-[90vh] w-full max-w-2xl space-y-4 overflow-y-auto border border-border bg-background p-8"
      >
        <h2 className="text-xl font-black uppercase tracking-tighter">
          {customer ? "Editar cliente" : "Novo cliente"}
        </h2>
        <Input label="Nome" value={name} onChange={setName} required autoFocus />
        <Input label="CPF / CNPJ" value={doc} onChange={setDoc} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="E-mail" value={email} onChange={setEmail} type="email" />
          <Input label="Telefone" value={phone} onChange={setPhone} />
        </div>

        <div className="border-t border-border pt-4">
          <h3 className="mb-3 font-mono text-[10px] uppercase tracking-widest text-primary">
            Endereço
          </h3>
          <div className="grid grid-cols-[1fr_auto] items-end gap-3">
            <Input
              label="CEP"
              value={zip}
              onChange={cep.onCepChange}
              onBlur={(e) => cep.onCepBlur(e.target.value)}
              placeholder="00000-000"
              inputMode="numeric"
              maxLength={9}
            />
            {cep.loading && (
              <span className="pb-3 font-mono text-[10px] uppercase tracking-widest text-primary">
                buscando…
              </span>
            )}
          </div>
          <div className="mt-3 grid grid-cols-[3fr_1fr] gap-3">
            <Input label="Endereço" value={street} onChange={setStreet} />
            <Input label="Número" value={number} onChange={setNumber} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Input label="Complemento" value={complement} onChange={setComplement} />
            <Input label="Bairro" value={district} onChange={setDistrict} />
          </div>
          <div className="mt-3 grid grid-cols-[2fr_1fr] gap-3">
            <Input label="Cidade" value={city} onChange={setCity} />
            <Input
              label="UF"
              value={stateUf}
              onChange={(v) => setStateUf(v.toUpperCase().slice(0, 2))}
              maxLength={2}
            />
          </div>
        </div>

        <label className="block">
          <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Observações
          </span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
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
