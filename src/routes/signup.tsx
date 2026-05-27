import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
  head: () => ({
    meta: [{ title: "Cadastrar empresa · CarneOS" }, { name: "robots", content: "noindex" }],
  }),
});

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function SignupPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    companyName: "",
    cnpj: "",
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // 1. Sign up — profile will be created by trigger
    const { data: signUp, error: signUpErr } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: window.location.origin + "/dashboard",
        data: { full_name: form.fullName },
      },
    });

    if (signUpErr) {
      setLoading(false);
      toast.error("Falha no cadastro", { description: signUpErr.message });
      return;
    }

    const userId = signUp.user?.id;
    const hasSession = !!signUp.session;

    if (!userId) {
      setLoading(false);
      toast.error("Não foi possível concluir o cadastro");
      return;
    }

    // If email confirmation is required, we cannot create the company now (no session => RLS denies).
    if (!hasSession) {
      setLoading(false);
      toast.success("Confirme seu e-mail", {
        description: "Enviamos um link para ativar sua conta antes de criar a empresa.",
      });
      navigate({ to: "/login" });
      return;
    }

    // 2. Create company (RLS: created_by must = auth.uid())
    const slug = `${slugify(form.companyName)}-${userId.slice(0, 6)}`;
    const { data: company, error: companyErr } = await supabase
      .from("companies")
      .insert({
        name: form.companyName,
        slug,
        cnpj: form.cnpj || null,
        created_by: userId,
      })
      .select()
      .single();

    if (companyErr || !company) {
      setLoading(false);
      toast.error("Erro ao criar empresa", { description: companyErr?.message });
      return;
    }

    // 3. Self-insert as owner (RLS allows: user inserting self as owner)
    const { error: memberErr } = await supabase
      .from("company_members")
      .insert({ company_id: company.id, user_id: userId, role: "owner" });

    if (memberErr) {
      setLoading(false);
      toast.error("Erro ao vincular operador", { description: memberErr.message });
      return;
    }

    // 4. Set current company
    await supabase.from("profiles").update({ current_company_id: company.id }).eq("id", userId);

    setLoading(false);
    toast.success("Empresa ativada");
    navigate({ to: "/dashboard", replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-16">
      <div className="w-full max-w-md">
        <Link
          to="/"
          className="mb-8 inline-flex items-center gap-2 text-2xl font-black tracking-tighter"
        >
          <span className="text-primary">CARNE</span>
          <span className="text-foreground">OS</span>
        </Link>
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">
          Onboarding Multi-tenant
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tighter">Ativar nova unidade</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Cada empresa opera em ambiente totalmente isolado. Você será o <span className="text-foreground">Owner</span>.
        </p>

        <form className="mt-10 space-y-5" onSubmit={onSubmit}>
          <Field
            label="Seu nome"
            value={form.fullName}
            onChange={(v) => setForm({ ...form, fullName: v })}
            placeholder="Carlos Mendes"
            required
          />
          <Field
            label="E-mail operacional"
            type="email"
            value={form.email}
            onChange={(v) => setForm({ ...form, email: v })}
            placeholder="voce@frigorifico.com"
            required
          />
          <Field
            label="Senha"
            type="password"
            value={form.password}
            onChange={(v) => setForm({ ...form, password: v })}
            placeholder="mínimo 6 caracteres"
            required
          />
          <div className="border-t border-border pt-5">
            <p className="mb-4 font-mono text-[10px] uppercase tracking-widest text-primary">
              Dados da Empresa
            </p>
            <Field
              label="Nome da empresa"
              value={form.companyName}
              onChange={(v) => setForm({ ...form, companyName: v })}
              placeholder="Frigorífico Aurora"
              required
            />
            <div className="mt-5">
              <Field
                label="CNPJ (opcional)"
                value={form.cnpj}
                onChange={(v) => setForm({ ...form, cnpj: v })}
                placeholder="00.000.000/0000-00"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center bg-primary px-4 py-3 font-mono text-xs font-bold uppercase tracking-widest text-primary-foreground transition-all hover:brightness-110 disabled:opacity-60"
          >
            {loading ? "Provisionando…" : "Criar empresa & Entrar"}
          </button>
        </form>

        <div className="mt-8 border-t border-border pt-6 text-center">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Já tem conta?{" "}
            <Link to="/login" className="text-primary hover:underline">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full border border-border bg-surface px-4 py-3 text-sm outline-none transition-colors focus:border-primary"
      />
    </div>
  );
}
