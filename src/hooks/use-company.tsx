import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";

export type Company = { id: string; name: string; slug: string; plan: string };

type Ctx = {
  companies: Company[];
  current: Company | null;
  loading: boolean;
  setCurrent: (c: Company) => Promise<void>;
  refresh: () => Promise<void>;
};

const CompanyContext = createContext<Ctx>({
  companies: [],
  current: null,
  loading: true,
  setCurrent: async () => {},
  refresh: async () => {},
});

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [current, setCurrentState] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) {
      setCompanies([]);
      setCurrentState(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data: cs } = await supabase
      .from("companies")
      .select("id, name, slug, plan")
      .order("created_at", { ascending: true });
    const list = (cs ?? []) as Company[];
    setCompanies(list);
    const { data: p } = await supabase
      .from("profiles")
      .select("current_company_id")
      .eq("id", user.id)
      .maybeSingle();
    const found = list.find((c) => c.id === p?.current_company_id) ?? list[0] ?? null;
    setCurrentState(found);
    if (found && p?.current_company_id !== found.id) {
      await supabase.from("profiles").update({ current_company_id: found.id }).eq("id", user.id);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const setCurrent = async (c: Company) => {
    setCurrentState(c);
    if (user) {
      await supabase.from("profiles").update({ current_company_id: c.id }).eq("id", user.id);
    }
  };

  return (
    <CompanyContext.Provider value={{ companies, current, loading, setCurrent, refresh: load }}>
      {children}
    </CompanyContext.Provider>
  );
}

export const useCompany = () => useContext(CompanyContext);
