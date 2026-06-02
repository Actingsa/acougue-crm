import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Company = { id: string; name: string; slug: string };

type AuthState = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  company: Company | null;
  isPlatformAdmin: boolean;
  refreshCompany: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthCtx = createContext<AuthState | null>(null);


async function fetchFirstCompany(userId: string): Promise<Company | null> {
  // Two-step query (no PostgREST embed) — there is no FK between
  // company_members.company_id and companies.id, so embeds return null
  // and would cause masters to be re-bootstrapped into a brand-new company.
  const { data: members, error: mErr } = await supabase
    .from("company_members")
    .select("company_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1);
  if (mErr) {
    console.error("[auth] failed to load memberships", mErr);
    return null;
  }
  const companyId = members?.[0]?.company_id;
  if (!companyId) return null;
  const { data: company, error: cErr } = await supabase
    .from("companies")
    .select("id, name, slug")
    .eq("id", companyId)
    .maybeSingle();
  if (cErr) {
    console.error("[auth] failed to load company", cErr);
    return null;
  }
  return (company as Company | null) ?? null;
}

async function bootstrapCompany(user: User): Promise<Company | null> {
  const defaultName =
    (user.user_metadata?.company_name as string) ||
    (user.user_metadata?.full_name as string) ||
    user.email?.split("@")[0] ||
    "Meu Açougue";
  const slug =
    defaultName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 40) +
    "-" +
    user.id.slice(0, 6);

  const { data: company, error } = await supabase
    .from("companies")
    .insert({ name: defaultName, slug, created_by: user.id })
    .select("id, name, slug")
    .single();
  if (error || !company) {
    console.error("[auth] failed to create company", error);
    return null;
  }

  const { error: memberError } = await supabase
    .from("company_members")
    .insert({ company_id: company.id, user_id: user.id, role: "owner" });
  if (memberError) console.error("[auth] failed to create membership", memberError);

  await supabase.from("profiles").update({ current_company_id: company.id }).eq("id", user.id);

  return company;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadCompany = async (u: User | null) => {
    if (!u) {
      setCompany(null);
      setIsPlatformAdmin(false);
      return;
    }
    const { data: pa } = await supabase
      .from("platform_admins")
      .select("user_id")
      .eq("user_id", u.id)
      .maybeSingle();
    const isAdmin = !!pa;
    setIsPlatformAdmin(isAdmin);

    // Always look for an existing membership first (works for masters
    // provisioned by the superadmin and for regular users alike).
    const existing = await fetchFirstCompany(u.id);
    if (existing) {
      setCompany(existing);
      return;
    }
    // Superadmins don't need a company of their own.
    if (isAdmin) {
      setCompany(null);
      return;
    }
    // Only auto-bootstrap a company for brand-new self-signup users.
    const c = await bootstrapCompany(u);
    setCompany(c);
  };


  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      // Defer Supabase calls to avoid deadlock inside the callback
      if (s?.user) {
        setTimeout(() => {
          loadCompany(s.user);
        }, 0);
      } else {
        setCompany(null);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        loadCompany(data.session.user).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthCtx.Provider
      value={{
        user,
        session,
        loading,
        company,
        isPlatformAdmin,

        refreshCompany: () => loadCompany(user),
        signOut: async () => {
          await supabase.auth.signOut();
        },
      }}
    >
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
