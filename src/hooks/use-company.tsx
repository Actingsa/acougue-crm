import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";

export type LicenseStatus = "trial" | "active" | "inactive" | "suspended";
export type Company = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  license_status: LicenseStatus;
  license_expires_at: string | null;
};

type Ctx = {
  companies: Company[];
  current: Company | null;
  loading: boolean;
  isPlatformAdmin: boolean;
  licenseActive: boolean;
  setCurrent: (c: Company) => Promise<void>;
  refresh: () => Promise<void>;
};

const CompanyContext = createContext<Ctx>({
  companies: [],
  current: null,
  loading: true,
  isPlatformAdmin: false,
  licenseActive: false,
  setCurrent: async () => {},
  refresh: async () => {},
});

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [current, setCurrentState] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);

  const load = async () => {
    if (!user) {
      setCompanies([]);
      setCurrentState(null);
      setIsPlatformAdmin(false);
      setLoading(false);
      return;
    }
    setLoading(true);

    const { data: admin } = await supabase
      .from("platform_admins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    const isAdmin = !!admin;
    setIsPlatformAdmin(isAdmin);

    const { data: cs } = await supabase
      .from("companies")
      .select("id, name, slug, plan, license_status, license_expires_at")
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

  const licenseActive = !!current && (current.license_status === "active" || current.license_status === "trial") &&
    (!current.license_expires_at || new Date(current.license_expires_at) > new Date());

  return (
    <CompanyContext.Provider value={{ companies, current, loading, isPlatformAdmin, licenseActive, setCurrent, refresh: load }}>
      {children}
    </CompanyContext.Provider>
  );
}

export const useCompany = () => useContext(CompanyContext);
