import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { DashboardTopbar } from "@/components/dashboard/Topbar";

export const Route = createFileRoute("/_authenticated/categories")({
  component: CategoriesPage,
  head: () => ({ meta: [{ title: "Categorias · Carne.CRM" }] }),
});

type Category = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
};

function CategoriesPage() {
  const { company } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);

  const { data: categories = [] } = useQuery({
    queryKey: ["product_categories", company?.id],
    enabled: !!company?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_categories")
        .select("*")
        .eq("company_id", company!.id)
        .order("name", { ascending: true });
      if (error) throw error;
      return data as Category[];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("product_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Categoria removida");
      qc.invalidateQueries({ queryKey: ["product_categories"] });
    },
    onError: (e: Error) => toast.error("Erro ao remover", { description: e.message }),
  });

  return (
    <>
      <DashboardTopbar
        title="Categorias de Produtos"
        action={
          <button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
            className="bg-primary px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-primary-foreground hover:brightness-110"
          >
            + Nova Categoria
          </button>
        }
      />
      <main className="flex-1 overflow-y-auto p-6 lg:p-8">
        <div className="border border-border">
          <table className="w-full text-left">
            <thead className="bg-surface-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Descrição</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {categories.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-10 text-center font-mono text-xs text-muted-foreground">
                    Nenhuma categoria cadastrada. Clique em "+ Nova Categoria".
                  </td>
                </tr>
              )}
              {categories.map((c) => (
                <tr key={c.id} className="border-t border-border hover:bg-white/5">
                  <td className="px-4 py-3 font-bold uppercase tracking-tight">{c.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.description ?? "—"}</td>
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
        <CategoryDialog
          category={editing}
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false);
            qc.invalidateQueries({ queryKey: ["product_categories"] });
          }}
        />
      )}
    </>
  );
}

function CategoryDialog({
  category,
  onClose,
  onSaved,
}: {
  category: Category | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { company } = useAuth();
  const [name, setName] = useState(category?.name ?? "");
  const [description, setDescription] = useState(category?.description ?? "");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;
    setLoading(true);
    try {
      const payload = {
        company_id: company.id,
        name: name.trim(),
        description: description.trim() || null,
      };
      if (category) {
        const { error } = await supabase.from("product_categories").update(payload).eq("id", category.id);
        if (error) throw error;
        toast.success("Categoria atualizada");
      } else {
        const { error } = await supabase.from("product_categories").insert(payload);
        if (error) throw error;
        toast.success("Categoria cadastrada");
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
        className="w-full max-w-lg space-y-4 border border-border bg-background p-8"
      >
        <h2 className="text-xl font-black uppercase tracking-tighter">
          {category ? "Editar categoria" : "Nova categoria"}
        </h2>
        <label className="block">
          <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Nome
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
            className="w-full border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </label>
        <label className="block">
          <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Descrição
          </span>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
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
