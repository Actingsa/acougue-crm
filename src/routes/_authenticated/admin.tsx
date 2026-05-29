import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCompany, type LicenseStatus } from "@/hooks/use-company";
import { Topbar } from "@/components/dashboard/Topbar";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
  head: () => ({
    meta: [{ title: "Super Admin · CarneOS" }, { name: "robots", content: "noindex" }],
  }),
});

type Row = {
  id: string;
  name: string;
  slug: string;
  cnpj: string | null;
  plan: string;
  license_status: LicenseStatus;
  license_expires_at: string | null;
  license_seats: number;
  license_notes: string | null;
  created_at: string;
};

type Member = { id: string; user_id: string; role: string; email: string | null; full_name: string | null };
type Admin = { user_id: string; email: string };

const STATUSES: LicenseStatus[] = ["trial", "active", "inactive", "suspended"];

function AdminPage() {
  const { isPlatformAdmin, loading: cLoading, refresh } = useCompany();
  const [rows, setRows] = useState<Row[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [members, setMembers] = useState<Record<string, Member[]>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [newAdmin, setNewAdmin] = useState("");

  const load = async () => {
    setLoading(true);
    const [{ data: cs }, { data: pa }] = await Promise.all([
      supabase.from("companies").select("*").order("created_at", { ascending: false }),
      supabase.from("platform_admins").select("user_id, email"),
    ]);
    setRows((cs ?? []) as Row[]);
    setAdmins((pa ?? []) as Admin[]);
    setLoading(false);
  };

  useEffect(() => {
    if (!cLoading && isPlatformAdmin) load();
  }, [cLoading, isPlatformAdmin]);

  if (cLoading) return <main className="p-8 text-sm text-muted-foreground">Carregando…</main>;
  if (!isPlatformAdmin) {
    return (
      <main className="p-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">403</p>
        <h1 className="mt-2 text-3xl font-black tracking-tighter">Acesso restrito ao Super Admin</h1>
      </main>
    );
  }

  const updateCompany = async (id: string, patch: Record<string, unknown>) => {
    const { error } = await supabase.from("companies").update(patch as never).eq("id", id);
    if (error) return toast.error("Falha ao salvar", { description: error.message });
    toast.success("Empresa atualizada");
    await load();
    await refresh();
  };

  const toggleStatus = async (r: Row, next: LicenseStatus) => updateCompany(r.id, { license_status: next });

  const loadMembers = async (companyId: string) => {
    if (members[companyId]) return;
    const { data: cm } = await supabase
      .from("company_members")
      .select("id, user_id, role")
      .eq("company_id", companyId);
    const ids = (cm ?? []).map((m) => m.user_id);
    const { data: profs } = ids.length
      ? await supabase.from("profiles").select("id, email, full_name").in("id", ids)
      : { data: [] as { id: string; email: string | null; full_name: string | null }[] };
    const merged: Member[] = (cm ?? []).map((m) => {
      const p = profs?.find((x) => x.id === m.user_id);
      return { id: m.id, user_id: m.user_id, role: m.role, email: p?.email ?? null, full_name: p?.full_name ?? null };
    });
    setMembers((prev) => ({ ...prev, [companyId]: merged }));
  };

  const setMemberRole = async (memberId: string, role: string, companyId: string) => {
    const { error } = await supabase.from("company_members").update({ role: role as never }).eq("id", memberId);
    if (error) return toast.error(error.message);
    setMembers((p) => ({ ...p, [companyId]: [] }));
    await loadMembers(companyId);
    toast.success("Cargo atualizado");
  };

  const removeMember = async (memberId: string, companyId: string) => {
    if (!confirm("Remover este usuário da empresa?")) return;
    const { error } = await supabase.from("company_members").delete().eq("id", memberId);
    if (error) return toast.error(error.message);
    setMembers((p) => ({ ...p, [companyId]: [] }));
    await loadMembers(companyId);
  };

  const addPlatformAdmin = async () => {
    const email = newAdmin.trim().toLowerCase();
    if (!email) return;
    const { data: p } = await supabase.from("profiles").select("id, email").eq("email", email).maybeSingle();
    if (!p) return toast.error("Usuário não encontrado. Peça para se cadastrar primeiro.");
    const { error } = await supabase.from("platform_admins").insert({ user_id: p.id, email: p.email ?? email });
    if (error) return toast.error(error.message);
    setNewAdmin("");
    toast.success("Super Admin adicionado");
    await load();
  };

  const removePlatformAdmin = async (userId: string) => {
    if (!confirm("Remover este Super Admin?")) return;
    const { error } = await supabase.from("platform_admins").delete().eq("user_id", userId);
    if (error) return toast.error(error.message);
    await load();
  };

  const active = rows.filter((r) => r.license_status === "active" || r.license_status === "trial").length;
  const inactive = rows.length - active;

  return (
    <>
      <Topbar section="Super Admin · Plataforma" />
      <main className="flex-1 space-y-8 overflow-y-auto p-6 lg:p-8">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {[
            { l: "Empresas Totais", v: rows.length },
            { l: "Licenças Ativas", v: active },
            { l: "Licenças Inativas", v: inactive },
            { l: "Super Admins", v: admins.length },
          ].map((k) => (
            <div key={k.l} className="border border-border bg-surface p-5">
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{k.l}</div>
              <div className="mt-2 text-3xl font-black tracking-tighter text-primary">{k.v}</div>
            </div>
          ))}
        </div>

        <section className="border border-border bg-surface">
          <header className="flex items-center justify-between border-b border-border p-5">
            <h2 className="text-lg font-black uppercase tracking-tighter">Empresas & Licenças</h2>
            <button
              onClick={load}
              className="font-mono text-[10px] uppercase tracking-widest text-primary hover:underline"
            >
              Atualizar
            </button>
          </header>
          {loading ? (
            <div className="p-6 text-sm text-muted-foreground">Carregando…</div>
          ) : (
            <div className="divide-y divide-border">
              {rows.map((r) => (
                <div key={r.id} className="p-5">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <span className="text-base font-bold uppercase tracking-tighter">{r.name}</span>
                        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                          {r.slug} · {r.cnpj ?? "sem CNPJ"}
                        </span>
                      </div>
                      <div className="mt-1 font-mono text-[10px] text-muted-foreground">
                        Plano {r.plan} · {r.license_seats} assentos ·{" "}
                        {r.license_expires_at ? `expira ${new Date(r.license_expires_at).toLocaleDateString("pt-BR")}` : "sem expiração"}
                      </div>
                    </div>
                    <select
                      value={r.license_status}
                      onChange={(e) => toggleStatus(r, e.target.value as LicenseStatus)}
                      className={
                        "border bg-background px-3 py-2 font-mono text-[10px] uppercase tracking-widest " +
                        (r.license_status === "active" || r.license_status === "trial"
                          ? "border-primary text-primary"
                          : "border-destructive text-destructive")
                      }
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <input
                      type="date"
                      defaultValue={r.license_expires_at ? r.license_expires_at.slice(0, 10) : ""}
                      onBlur={(e) =>
                        updateCompany(r.id, {
                          license_expires_at: e.target.value ? new Date(e.target.value).toISOString() : null,
                        })
                      }
                      className="border border-border bg-background px-3 py-2 font-mono text-[10px]"
                    />
                    <input
                      type="number"
                      min={1}
                      defaultValue={r.license_seats}
                      onBlur={(e) => {
                        const n = Number(e.target.value);
                        if (n !== r.license_seats) updateCompany(r.id, { license_seats: n });
                      }}
                      className="w-20 border border-border bg-background px-3 py-2 font-mono text-[10px]"
                    />
                    <button
                      onClick={() => {
                        setExpanded(expanded === r.id ? null : r.id);
                        if (expanded !== r.id) loadMembers(r.id);
                      }}
                      className="font-mono text-[10px] uppercase tracking-widest text-primary hover:underline"
                    >
                      {expanded === r.id ? "Fechar" : "Usuários ▾"}
                    </button>
                  </div>

                  {expanded === r.id && (
                    <div className="mt-4 border-t border-border pt-4">
                      <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                        Usuários da empresa
                      </div>
                      {!members[r.id] ? (
                        <div className="text-xs text-muted-foreground">Carregando…</div>
                      ) : members[r.id].length === 0 ? (
                        <div className="text-xs text-muted-foreground">Nenhum usuário vinculado.</div>
                      ) : (
                        <div className="space-y-2">
                          {members[r.id].map((m) => (
                            <div
                              key={m.id}
                              className="flex flex-wrap items-center gap-3 border border-border bg-background p-3"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-bold">{m.full_name ?? "—"}</div>
                                <div className="font-mono text-[10px] text-muted-foreground">{m.email}</div>
                              </div>
                              <select
                                value={m.role}
                                onChange={(e) => setMemberRole(m.id, e.target.value, r.id)}
                                className="border border-border bg-surface px-2 py-1 font-mono text-[10px] uppercase tracking-widest"
                              >
                                {["owner", "admin", "manager", "butcher", "cashier"].map((x) => (
                                  <option key={x} value={x}>
                                    {x}
                                  </option>
                                ))}
                              </select>
                              <button
                                onClick={() => removeMember(m.id, r.id)}
                                className="font-mono text-[10px] uppercase tracking-widest text-destructive hover:underline"
                              >
                                Remover
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="border border-border bg-surface">
          <header className="border-b border-border p-5">
            <h2 className="text-lg font-black uppercase tracking-tighter">Super Admins da Plataforma</h2>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Acesso irrestrito a todas as empresas, licenças e dados.
            </p>
          </header>
          <div className="divide-y divide-border">
            {admins.map((a) => (
              <div key={a.user_id} className="flex items-center justify-between p-4">
                <div className="font-mono text-xs">{a.email}</div>
                <button
                  onClick={() => removePlatformAdmin(a.user_id)}
                  className="font-mono text-[10px] uppercase tracking-widest text-destructive hover:underline"
                >
                  Revogar
                </button>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 border-t border-border p-4">
            <input
              type="email"
              value={newAdmin}
              onChange={(e) => setNewAdmin(e.target.value)}
              placeholder="email@dominio.com"
              className="flex-1 border border-border bg-background px-3 py-2 text-sm"
            />
            <button
              onClick={addPlatformAdmin}
              className="bg-primary px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-primary-foreground"
            >
              Adicionar Super Admin
            </button>
          </div>
        </section>
      </main>
    </>
  );
}
