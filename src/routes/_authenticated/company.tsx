import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { DashboardTopbar } from "@/components/dashboard/Topbar";
import { getCompanyProfile, updateCompanyProfile } from "@/lib/company.functions";
import { useCepLookup } from "@/lib/cep";

export const Route = createFileRoute("/_authenticated/company")({
  component: CompanyPage,
  head: () => ({ meta: [{ title: "Empresa · Carne.CRM" }] }),
});

type FormState = {
  name: string;
  legal_name: string;
  trade_name: string;
  cnpj: string;
  ie: string;
  im: string;
  tax_regime: string;
  email: string;
  phone: string;
  website: string;
  logo_url: string;
  address_street: string;
  address_number: string;
  address_complement: string;
  address_district: string;
  address_city: string;
  address_state: string;
  address_zip: string;
  report_footer: string;
};

const empty: FormState = {
  name: "",
  legal_name: "",
  trade_name: "",
  cnpj: "",
  ie: "",
  im: "",
  tax_regime: "Simples Nacional",
  email: "",
  phone: "",
  website: "",
  logo_url: "",
  address_street: "",
  address_number: "",
  address_complement: "",
  address_district: "",
  address_city: "",
  address_state: "",
  address_zip: "",
  report_footer: "",
};

function CompanyPage() {
  const { company, refreshCompany } = useAuth();
  const qc = useQueryClient();
  const getFn = useServerFn(getCompanyProfile);
  const updateFn = useServerFn(updateCompanyProfile);
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [uploading, setUploading] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const cep = useCepLookup(
    {
      setStreet: (v) => setForm((f) => ({ ...f, address_street: v })),
      setDistrict: (v) => setForm((f) => ({ ...f, address_district: v })),
      setCity: (v) => setForm((f) => ({ ...f, address_city: v })),
      setState: (v) => setForm((f) => ({ ...f, address_state: v })),
    },
    (v) => setForm((f) => ({ ...f, address_zip: v })),
  );


  const { data } = useQuery({
    queryKey: ["company-profile", company?.id],
    enabled: !!company?.id,
    queryFn: () => getFn({ data: { companyId: company!.id } }),
  });

  useEffect(() => {
    if (!data?.company) return;
    const c = data.company as Record<string, unknown>;
    setForm({
      ...empty,
      ...Object.fromEntries(
        Object.keys(empty).map((k) => [k, (c[k] as string) ?? ""]),
      ),
    } as FormState);
  }, [data]);

  // Resolve signed URL for the logo preview (private bucket)
  useEffect(() => {
    let alive = true;
    const path = form.logo_url;
    if (!path) { setLogoPreview(null); return; }
    if (path.startsWith("http")) { setLogoPreview(path); return; }
    supabase.storage
      .from("company-logos")
      .createSignedUrl(path, 3600)
      .then(({ data }) => { if (alive) setLogoPreview(data?.signedUrl ?? null); });
    return () => { alive = false; };
  }, [form.logo_url]);

  const save = useMutation({
    mutationFn: async () => {
      if (!company) throw new Error("Sem empresa");
      await updateFn({
        data: {
          companyId: company.id,
          ...Object.fromEntries(
            Object.entries(form).map(([k, v]) => [k, v === "" ? null : v]),
          ),
          name: form.name || company.name,
        },
      });
    },
    onSuccess: () => {
      toast.success("Dados da empresa salvos");
      qc.invalidateQueries({ queryKey: ["company-profile"] });
      refreshCompany();
    },
    onError: (e: Error) => toast.error("Falha", { description: e.message }),
  });

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !company) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Arquivo muito grande", { description: "Máx. 2MB" });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${company.id}/logo-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("company-logos")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      setForm((f) => ({ ...f, logo_url: path }));
      toast.success("Logo enviada. Lembre de salvar.");
    } catch (err) {
      toast.error("Erro no upload", { description: err instanceof Error ? err.message : "" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <>
      <DashboardTopbar
        title="Empresa · Dados & Logomarca"
        action={
          <button
            onClick={() => save.mutate()}
            disabled={save.isPending}
            className="bg-primary px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-primary-foreground hover:brightness-110 disabled:opacity-60"
          >
            {save.isPending ? "Salvando…" : "Salvar alterações"}
          </button>
        }
      />
      <main className="flex-1 space-y-6 overflow-y-auto p-6 lg:p-8">
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
          <div className="border border-border bg-surface p-6">
            <div className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Logomarca
            </div>
            <div className="flex aspect-square w-full items-center justify-center border border-dashed border-border bg-surface-2">
              {logoPreview ? (
                <img src={logoPreview} alt="Logo da empresa" className="max-h-full max-w-full object-contain" />
              ) : (
                <span className="text-xs text-muted-foreground">Sem logo</span>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={onUpload}
              className="mt-3 block w-full text-xs"
            />
            <p className="mt-2 text-[10px] text-muted-foreground">
              PNG, JPG, WEBP ou SVG. Máx. 2MB. Aparecerá nos relatórios e impressões.
            </p>
            {uploading && (
              <div className="mt-2 font-mono text-[10px] text-primary">enviando…</div>
            )}
          </div>

          <div className="space-y-4">
            <Group title="Identificação">
              <Grid cols={2}>
                <F label="Nome fantasia / Apelido">
                  <I value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
                </F>
                <F label="Razão social">
                  <I value={form.legal_name} onChange={(v) => setForm({ ...form, legal_name: v })} />
                </F>
              </Grid>
              <Grid cols={3}>
                <F label="CNPJ"><I value={form.cnpj} onChange={(v) => setForm({ ...form, cnpj: v })} /></F>
                <F label="Inscrição Estadual"><I value={form.ie} onChange={(v) => setForm({ ...form, ie: v })} /></F>
                <F label="Inscrição Municipal"><I value={form.im} onChange={(v) => setForm({ ...form, im: v })} /></F>
              </Grid>
              <F label="Regime tributário">
                <select value={form.tax_regime} onChange={(e) => setForm({ ...form, tax_regime: e.target.value })} className={input}>
                  <option>Simples Nacional</option>
                  <option>Lucro Presumido</option>
                  <option>Lucro Real</option>
                  <option>MEI</option>
                </select>
              </F>
            </Group>

            <Group title="Contato">
              <Grid cols={3}>
                <F label="E-mail"><I value={form.email} onChange={(v) => setForm({ ...form, email: v })} /></F>
                <F label="Telefone / WhatsApp"><I value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} /></F>
                <F label="Site"><I value={form.website} onChange={(v) => setForm({ ...form, website: v })} /></F>
              </Grid>
            </Group>

            <Group title="Endereço">
              <Grid cols={[1, 3]}>
                <F label={`CEP${cep.loading ? " · buscando…" : ""}`}>
                  <input
                    value={form.address_zip}
                    onChange={(e) => cep.onCepChange(e.target.value)}
                    onBlur={(e) => cep.onCepBlur(e.target.value)}
                    placeholder="00000-000"
                    inputMode="numeric"
                    maxLength={9}
                    className={input}
                  />
                </F>
                <F label="Logradouro"><I value={form.address_street} onChange={(v) => setForm({ ...form, address_street: v })} /></F>
              </Grid>
              <Grid cols={[1, 2]}>
                <F label="Número"><I value={form.address_number} onChange={(v) => setForm({ ...form, address_number: v })} /></F>
                <F label="Complemento"><I value={form.address_complement} onChange={(v) => setForm({ ...form, address_complement: v })} /></F>
              </Grid>
              <Grid cols={3}>
                <F label="Bairro"><I value={form.address_district} onChange={(v) => setForm({ ...form, address_district: v })} /></F>
                <F label="Cidade"><I value={form.address_city} onChange={(v) => setForm({ ...form, address_city: v })} /></F>
                <F label="UF"><I value={form.address_state} onChange={(v) => setForm({ ...form, address_state: v.toUpperCase().slice(0, 2) })} /></F>
              </Grid>
            </Group>


            <Group title="Personalização de impressões">
              <F label="Rodapé padrão para cupons e relatórios">
                <textarea
                  value={form.report_footer}
                  onChange={(e) => setForm({ ...form, report_footer: e.target.value })}
                  rows={3}
                  className={input}
                  placeholder="Ex.: Obrigado pela preferência! Volte sempre."
                />
              </F>
            </Group>
          </div>
        </section>
      </main>
    </>
  );
}

const input =
  "w-full border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary";

function I({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <input value={value} onChange={(e) => onChange(e.target.value)} className={input} />;
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function Grid({ cols, children }: { cols: number | number[]; children: React.ReactNode }) {
  const cls =
    typeof cols === "number"
      ? `grid grid-cols-1 md:grid-cols-${cols} gap-3`
      : `grid grid-cols-1 md:grid-cols-${cols.reduce((a, b) => a + b, 0)} gap-3`;
  // For the asymmetric case, fall back to template:
  if (Array.isArray(cols)) {
    return (
      <div
        className="grid grid-cols-1 gap-3 md:grid"
        style={{ gridTemplateColumns: cols.map((n) => `${n}fr`).join(" ") }}
      >
        {children}
      </div>
    );
  }
  return <div className={cls}>{children}</div>;
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 border border-border bg-surface p-6">
      <h3 className="font-mono text-[10px] uppercase tracking-widest text-primary">{title}</h3>
      {children}
    </section>
  );
}
