import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { DashboardTopbar } from "@/components/dashboard/Topbar";
import {
  adminCreateCompany,
  adminDeleteCompany,
  adminListCompanies,
  adminUpdateLicense,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
  head: () => ({ meta: [{ title: "Superadmin · Carne.CRM" }] }),
});

type Plan = "trial" | "starter" | "pro" | "enterprise";
type LicenseStatus = "trial" | "active" | "inactive" | "suspended";

const PLANS: Plan[] = ["trial", "starter", "pro", "enterprise"];
const STATUSES: LicenseStatus[] = ["trial", "active", "inactive", "suspended"];

function AdminPage() {
  const { isPlatformAdmin, loading } = useAuth();
  const qc = useQueryClient();
  const listFn = useServerFn(adminListCompanies);
  const updateFn = useServerFn(adminUpdateLicense);
  const deleteFn = useServerFn(adminDeleteCompany);
  const [open, setOpen] = useState(false);

  const { data } = useQuery({
    queryKey: ["admin-companies"],
    enabled: isPlatformAdmin,
    queryFn: () => listFn({}),
  });

  const update = useMutation({
    mutationFn: (args: Parameters<typeof updateFn>[0]["data"]) =>
      updateFn({ data: args }),
    onSuccess: () => {
      toast.success("Licença atualizada");
      qc.invalidateQueries({ queryKey: ["admin-companies"] });
    },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });

  const del = useMutation({
    mutationFn: (companyId: string) => deleteFn({ data: { companyId } }),
    onSuccess: () => {
      toast.success("Empresa removida");
      qc.invalidateQueries({ queryKey: ["admin-companies"] });
    },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });

  const seatsByCompany = useMemo(() => {
    const map = new Map<string, number>();
    (data?.members ?? []).forEach((m) => {
      map.set(m.company_id, (map.get(m.company_id) ?? 0) + 1);
    });
    return map;
  }, [data]);

  if (loading) return null;
  if (!isPlatformAdmin) return <Navigate to="/dashboard" replace />;

  const totalMRR = (data?.companies ?? [])
    .filter((c) => c.license_status === "active")
    .length;

  return (
    <>
      <DashboardTopbar
        title="Superadmin · Empresas & Licenças"
        action={
          <button
            onClick={() => setOpen(true)}
            className="bg-primary px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-primary-foreground hover:brightness-110"
          >
            + Nova Empresa
          </button>
        }
      />
      <main className="flex-1 overflow-y-auto p-6 lg:p-8">
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat
            label="Empresas"
            value={String(data?.companies.length ?? 0)}
          />
          <Stat label="Licenças Ativas" value={String(totalMRR)} />
          <Stat
            label="Em Trial"
            value={String(
              (data?.companies ?? []).filter((c) => c.license_status === "trial").length,
            )}
          />
          <Stat
            label="Suspensas"
            value={String(
              (data?.companies ?? []).filter((c) => c.license_status === "suspended")
                .length,
            )}
          />
        </div>

        <div className="border border-border">
          <table className="w-full text-left">
            <thead className="bg-surface-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Empresa</th>
                <th className="px-4 py-3">CNPJ</th>
                <th className="px-4 py-3">Plano</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Assentos</th>
                <th className="px-4 py-3">Expira</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {(data?.companies ?? []).length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center font-mono text-xs text-muted-foreground"
                  >
                    Nenhuma empresa cadastrada.
                  </td>
                </tr>
              )}
              {(data?.companies ?? []).map((c) => {
                const used = seatsByCompany.get(c.id) ?? 0;
                return (
                  <tr key={c.id} className="border-t border-border align-middle">
                    <td className="px-4 py-3">
                      <div className="font-bold uppercase tracking-tight">{c.name}</div>
                      <div className="font-mono text-[10px] text-muted-foreground">
                        #{c.slug}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">
                      {c.cnpj ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={c.plan}
                        onChange={(e) =>
                          update.mutate({
                            companyId: c.id,
                            plan: e.target.value as Plan,
                          })
                        }
                        className="border border-border bg-surface px-2 py-1 text-xs uppercase"
                      >
                        {PLANS.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={c.license_status}
                        onChange={(e) =>
                          update.mutate({
                            companyId: c.id,
                            licenseStatus: e.target.value as LicenseStatus,
                          })
                        }
                        className="border border-border bg-surface px-2 py-1 text-xs uppercase"
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min={1}
                        max={500}
                        defaultValue={c.license_seats}
                        onBlur={(e) => {
                          const v = parseInt(e.target.value, 10);
                          if (!Number.isFinite(v) || v === c.license_seats) return;
                          update.mutate({ companyId: c.id, licenseSeats: v });
                        }}
                        className="w-20 border border-border bg-surface px-2 py-1 text-xs"
                      />
                      <span className="ml-2 font-mono text-[10px] text-muted-foreground">
                        {used} usados
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="date"
                        defaultValue={
                          c.license_expires_at
                            ? new Date(c.license_expires_at).toISOString().slice(0, 10)
                            : ""
                        }
                        onBlur={(e) => {
                          const v = e.target.value;
                          update.mutate({
                            companyId: c.id,
                            licenseExpiresAt: v
                              ? new Date(v + "T23:59:59Z").toISOString()
                              : null,
                          });
                        }}
                        className="border border-border bg-surface px-2 py-1 text-xs"
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => {
                          if (
                            confirm(
                              `Excluir "${c.name}"? Esta ação remove TODOS os dados da empresa.`,
                            )
                          )
                            del.mutate(c.id);
                        }}
                        className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-warning"
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>

      {open && (
        <NewCompanyDialog
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false);
            qc.invalidateQueries({ queryKey: ["admin-companies"] });
          }}
        />
      )}
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-border bg-surface p-4">
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 text-3xl font-black tracking-tighter">{value}</div>
    </div>
  );
}

function NewCompanyDialog({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const createFn = useServerFn(adminCreateCompany);
  const [companyName, setCompanyName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [plan, setPlan] = useState<Plan>("trial");
  const [licenseStatus, setLicenseStatus] = useState<LicenseStatus>("trial");
  const [licenseSeats, setLicenseSeats] = useState(5);
  const [licenseExpiresAt, setLicenseExpiresAt] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createFn({
        data: {
          companyName,
          cnpj: cnpj || null,
          plan,
          licenseStatus,
          licenseSeats,
          licenseExpiresAt: licenseExpiresAt
            ? new Date(licenseExpiresAt + "T23:59:59Z").toISOString()
            : null,
          ownerName,
          ownerEmail,
          ownerPassword,
        },
      });
      toast.success("Empresa criada", {
        description: "Usuário master provisionado com sucesso.",
      });
      onSaved();
    } catch (err) {
      toast.error("Falha ao criar", {
        description: err instanceof Error ? err.message : "",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <form
        onSubmit={onSubmit}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-2xl space-y-4 overflow-y-auto border border-border bg-background p-8"
      >
        <h2 className="text-xl font-black uppercase tracking-tighter">
          Provisionar nova empresa
        </h2>
        <p className="text-xs text-muted-foreground">
          O usuário master receberá acesso total para gerir sua própria equipe.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <F label="Razão social / Nome">
            <input
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className={inputCls}
            />
          </F>
          <F label="CNPJ (opcional)">
            <input value={cnpj} onChange={(e) => setCnpj(e.target.value)} className={inputCls} />
          </F>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <F label="Plano">
            <select value={plan} onChange={(e) => setPlan(e.target.value as Plan)} className={inputCls}>
              {PLANS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </F>
          <F label="Status">
            <select
              value={licenseStatus}
              onChange={(e) => setLicenseStatus(e.target.value as LicenseStatus)}
              className={inputCls}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </F>
          <F label="Assentos">
            <input
              type="number"
              min={1}
              max={500}
              value={licenseSeats}
              onChange={(e) => setLicenseSeats(parseInt(e.target.value, 10) || 1)}
              className={inputCls}
            />
          </F>
        </div>

        <F label="Validade da licença (opcional)">
          <input
            type="date"
            value={licenseExpiresAt}
            onChange={(e) => setLicenseExpiresAt(e.target.value)}
            className={inputCls}
          />
        </F>

        <div className="mt-4 border-t border-border pt-4">
          <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-primary">
            Usuário Master
          </p>
          <div className="grid grid-cols-2 gap-3">
            <F label="Nome">
              <input
                required
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className={inputCls}
              />
            </F>
            <F label="E-mail">
              <input
                required
                type="email"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                className={inputCls}
              />
            </F>
          </div>
          <F label="Senha inicial">
            <input
              required
              minLength={8}
              type="text"
              value={ownerPassword}
              onChange={(e) => setOwnerPassword(e.target.value)}
              className={inputCls}
            />
          </F>
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
            {loading ? "Criando…" : "Provisionar empresa"}
          </button>
        </div>
      </form>
    </div>
  );
}

const inputCls =
  "w-full border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary";

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
