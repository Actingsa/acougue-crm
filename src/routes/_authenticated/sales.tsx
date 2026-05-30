import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { DashboardTopbar } from "@/components/dashboard/Topbar";
import { formatBRL } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/sales")({
  component: SalesPage,
  head: () => ({ meta: [{ title: "Vendas · Carne.CRM" }] }),
});

type Sale = {
  id: string;
  number: number;
  total_cents: number;
  subtotal_cents: number;
  discount_cents: number;
  pay_method: string;
  status: string;
  created_at: string;
  terminal: string;
};

function SalesPage() {
  const { company } = useAuth();
  const { data: sales = [] } = useQuery({
    queryKey: ["sales", company?.id],
    enabled: !!company?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("*")
        .eq("company_id", company!.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as Sale[];
    },
  });

  return (
    <>
      <DashboardTopbar title="Vendas" />
      <main className="flex-1 overflow-y-auto p-6 lg:p-8">
        <div className="border border-border">
          <table className="w-full text-left">
            <thead className="bg-surface-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Terminal</th>
                <th className="px-4 py-3">Pagto</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {sales.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center font-mono text-xs text-muted-foreground">
                    Nenhuma venda registrada.
                  </td>
                </tr>
              )}
              {sales.map((s) => (
                <tr key={s.id} className="border-t border-border hover:bg-white/5">
                  <td className="px-4 py-3 font-mono">{s.number}</td>
                  <td className="px-4 py-3 font-mono text-muted-foreground">
                    {new Date(s.created_at).toLocaleString("pt-BR")}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{s.terminal}</td>
                  <td className="px-4 py-3 uppercase text-xs">{s.pay_method}</td>
                  <td className="px-4 py-3 uppercase text-xs text-success">{s.status}</td>
                  <td className="px-4 py-3 text-right font-mono text-primary">
                    {formatBRL(s.total_cents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
