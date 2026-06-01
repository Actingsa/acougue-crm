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


async function ensureCompany(user: User): Promise<Company | null> {
  // Try find any membership
  const { data: members } = await supabase
    .from("company_members")
    .select("company_id, companies:company_id ( id, name, slug )")
    .eq("user_id", user.id)
    .limit(1);

  const existing = members?.[0]?.companies as Company | undefined;
  if (existing) return existing;

  // Bootstrap: create a default company + owner membership
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
    setIsPlatformAdmin(!!pa);
    // Try to find an existing membership first; only bootstrap a company
    // for non-platform-admins (superadmins manage companies themselves).
    const { data: members } = await supabase
      .from("company_members")
      .select("company_id, companies:company_id ( id, name, slug )")
      .eq("user_id", u.id)
      .limit(1);
    const existing = members?.[0]?.companies as Company | undefined;
    if (existing) {
      setCompany(existing);
      return;
    }
    if (pa) {
      setCompany(null);
      return;
    }
    const c = await ensureCompany(u);
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
