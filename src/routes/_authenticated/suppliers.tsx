import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { DashboardTopbar } from "@/components/dashboard/Topbar";
import { Input } from "./products";
import { useCepLookup } from "@/lib/cep";

export const Route = createFileRoute("/_authenticated/suppliers")({
  component: SuppliersPage,
  head: () => ({ meta: [{ title: "Fornecedores · Carne.CRM" }] }),
});

type Supplier = {
  id: string;
  name: string;
  legal_name: string | null;
  doc: string | null;
  ie: string | null;
  email: string | null;
  phone: string | null;
  contact_name: string | null;
  notes: string | null;
  active: boolean;
  address_zip: string | null;
  address_street: string | null;
  address_number: string | null;
  address_complement: string | null;
  address_district: string | null;
  address_city: string | null;
  address_state: string | null;
};

function SuppliersPage() {
  const { company } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers", company?.id],
    enabled: !!company?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .eq("company_id", company!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Supplier[];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("suppliers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Fornecedor removido");
      qc.invalidateQueries({ queryKey: ["suppliers"] });
    },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });

  return (
    <>
      <DashboardTopbar
        title="Fornecedores"
        action={
          <button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
            className="bg-primary px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-primary-foreground hover:brightness-110"
          >
            + Novo Fornecedor
          </button>
        }
      />
      <main className="flex-1 overflow-y-auto p-6 lg:p-8">
        <div className="border border-border">
          <table className="w-full text-left">
            <thead className="bg-surface-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Nome / Razão Social</th>
                <th className="px-4 py-3">CNPJ / CPF</th>
                <th className="px-4 py-3">Cidade/UF</th>
                <th className="px-4 py-3">Contato</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {suppliers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center font-mono text-xs text-muted-foreground">
                    Nenhum fornecedor cadastrado.
                  </td>
                </tr>
              )}
              {suppliers.map((s) => (
                <tr key={s.id} className="border-t border-border hover:bg-white/5">
                  <td className="px-4 py-3">
                    <div className="font-bold uppercase tracking-tight">{s.name}</div>
                    {s.legal_name && (
                      <div className="font-mono text-[10px] text-muted-foreground">{s.legal_name}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-muted-foreground">{s.doc ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {[s.address_city, s.address_state].filter(Boolean).join(" / ") || "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {s.email ?? s.phone ?? s.contact_name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => {
                        setEditing(s);
                        setOpen(true);
                      }}
                      className="mr-2 font-mono text-[10px] uppercase tracking-widest text-primary hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Remover "${s.name}"?`)) del.mutate(s.id);
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
        <SupplierDialog
          supplier={editing}
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false);
            qc.invalidateQueries({ queryKey: ["suppliers"] });
          }}
        />
      )}
    </>
  );
}

function SupplierDialog({
  supplier,
  onClose,
  onSaved,
}: {
  supplier: Supplier | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { company } = useAuth();
  const [name, setName] = useState(supplier?.name ?? "");
  const [legalName, setLegalName] = useState(supplier?.legal_name ?? "");
  const [doc, setDoc] = useState(supplier?.doc ?? "");
  const [ie, setIe] = useState(supplier?.ie ?? "");
  const [email, setEmail] = useState(supplier?.email ?? "");
  const [phone, setPhone] = useState(supplier?.phone ?? "");
  const [contactName, setContactName] = useState(supplier?.contact_name ?? "");
  const [notes, setNotes] = useState(supplier?.notes ?? "");
  const [active, setActive] = useState(supplier?.active ?? true);
  const [zip, setZip] = useState(supplier?.address_zip ?? "");
  const [street, setStreet] = useState(supplier?.address_street ?? "");
  const [number, setNumber] = useState(supplier?.address_number ?? "");
  const [complement, setComplement] = useState(supplier?.address_complement ?? "");
  const [district, setDistrict] = useState(supplier?.address_district ?? "");
  const [city, setCity] = useState(supplier?.address_city ?? "");
  const [stateUf, setStateUf] = useState(supplier?.address_state ?? "");
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
        legal_name: legalName.trim() || null,
        doc: doc.trim() || null,
        ie: ie.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        contact_name: contactName.trim() || null,
        notes: notes.trim() || null,
        active,
        address_zip: zip.trim() || null,
        address_street: street.trim() || null,
        address_number: number.trim() || null,
        address_complement: complement.trim() || null,
        address_district: district.trim() || null,
        address_city: city.trim() || null,
        address_state: stateUf.trim().toUpperCase().slice(0, 2) || null,
      };
      if (supplier) {
        const { error } = await supabase.from("suppliers").update(payload).eq("id", supplier.id);
        if (error) throw error;
        toast.success("Fornecedor atualizado");
      } else {
        const { error } = await supabase.from("suppliers").insert(payload);
        if (error) throw error;
        toast.success("Fornecedor cadastrado");
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
          {supplier ? "Editar fornecedor" : "Novo fornecedor"}
        </h2>

        <Input label="Nome Fantasia" value={name} onChange={setName} required autoFocus />
        <Input label="Razão Social" value={legalName} onChange={setLegalName} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="CNPJ / CPF" value={doc} onChange={setDoc} />
          <Input label="Inscrição Estadual" value={ie} onChange={setIe} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="E-mail" value={email} onChange={setEmail} type="email" />
          <Input label="Telefone" value={phone} onChange={setPhone} />
        </div>
        <Input label="Contato Responsável" value={contactName} onChange={setContactName} />

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

        <label className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          Fornecedor ativo
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
