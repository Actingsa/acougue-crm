import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { DashboardTopbar } from "@/components/dashboard/Topbar";
import {
  teamCreateMember,
  teamListMembers,
  teamRemoveMember,
  teamUpdateRole,
} from "@/lib/team.functions";

export const Route = createFileRoute("/_authenticated/team")({
  component: TeamPage,
  head: () => ({ meta: [{ title: "Equipe · Carne.CRM" }] }),
});

type Role = "owner" | "admin" | "manager" | "cashier" | "butcher";
const ROLES: { v: Role; label: string }[] = [
  { v: "owner", label: "Proprietário" },
  { v: "admin", label: "Administrador" },
  { v: "manager", label: "Gerente" },
  { v: "butcher", label: "Açougueiro" },
  { v: "cashier", label: "Caixa / PDV" },
];

function TeamPage() {
  const { company } = useAuth();
  const qc = useQueryClient();
  const listFn = useServerFn(teamListMembers);
  const createFn = useServerFn(teamCreateMember);
  const updateFn = useServerFn(teamUpdateRole);
  const removeFn = useServerFn(teamRemoveMember);
  const [open, setOpen] = useState(false);

  const { data } = useQuery({
    queryKey: ["team", company?.id],
    enabled: !!company?.id,
    queryFn: () => listFn({ data: { companyId: company!.id } }),
  });

  const update = useMutation({
    mutationFn: (args: { memberId: string; role: Role }) =>
      updateFn({ data: { companyId: company!.id, ...args } }),
    onSuccess: () => {
      toast.success("Permissão atualizada");
      qc.invalidateQueries({ queryKey: ["team"] });
    },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });

  const remove = useMutation({
    mutationFn: (memberId: string) =>
      removeFn({ data: { companyId: company!.id, memberId } }),
    onSuccess: () => {
      toast.success("Membro removido");
      qc.invalidateQueries({ queryKey: ["team"] });
    },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });

  return (
    <>
      <DashboardTopbar
        title="Equipe & Permissões"
        action={
          <button
            onClick={() => setOpen(true)}
            className="bg-primary px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-primary-foreground hover:brightness-110"
          >
            + Novo Usuário
          </button>
        }
      />
      <main className="flex-1 overflow-y-auto p-6 lg:p-8">
        <div className="border border-border">
          <table className="w-full text-left">
            <thead className="bg-surface-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">E-mail</th>
                <th className="px-4 py-3">Permissão</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {(data?.members ?? []).length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-10 text-center font-mono text-xs text-muted-foreground"
                  >
                    Nenhum membro além de você.
                  </td>
                </tr>
              )}
              {(data?.members ?? []).map((m) => (
                <tr key={m.id} className="border-t border-border hover:bg-white/5">
                  <td className="px-4 py-3 font-bold uppercase tracking-tight">
                    {m.full_name ?? "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-muted-foreground">
                    {m.email ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={m.role}
                      onChange={(e) =>
                        update.mutate({ memberId: m.id, role: e.target.value as Role })
                      }
                      className="border border-border bg-surface px-2 py-1 text-xs uppercase tracking-wider"
                    >
                      {ROLES.map((r) => (
                        <option key={r.v} value={r.v}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => {
                        if (confirm(`Remover ${m.full_name ?? m.email}?`))
                          remove.mutate(m.id);
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
        <NewMemberDialog
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false);
            qc.invalidateQueries({ queryKey: ["team"] });
          }}
          createFn={createFn}
          companyId={company!.id}
        />
      )}
    </>
  );
}

function NewMemberDialog({
  onClose,
  onSaved,
  createFn,
  companyId,
}: {
  onClose: () => void;
  onSaved: () => void;
  createFn: ReturnType<typeof useServerFn<typeof teamCreateMember>>;
  companyId: string;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("cashier");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createFn({ data: { companyId, name, email, password, role } });
      toast.success("Usuário criado");
      onSaved();
    } catch (err) {
      toast.error("Falha", { description: err instanceof Error ? err.message : "" });
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
        className="w-full max-w-md space-y-4 border border-border bg-background p-8"
      >
        <h2 className="text-xl font-black uppercase tracking-tighter">Novo usuário</h2>
        <Field label="Nome completo">
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="E-mail">
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Senha temporária">
          <input
            required
            minLength={8}
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Permissão">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className={inputCls}
          >
            {ROLES.map((r) => (
              <option key={r.v} value={r.v}>
                {r.label}
              </option>
            ))}
          </select>
        </Field>
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
            {loading ? "Criando…" : "Criar usuário"}
          </button>
        </div>
      </form>
    </div>
  );
}

const inputCls =
  "w-full border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
