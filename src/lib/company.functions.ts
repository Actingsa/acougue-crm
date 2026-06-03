import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const upsertSchema = z.object({
  companyId: z.string().uuid(),
  name: z.string().min(2).max(160).optional(),
  legal_name: z.string().max(200).nullable().optional(),
  trade_name: z.string().max(200).nullable().optional(),
  cnpj: z.string().max(32).nullable().optional(),
  ie: z.string().max(32).nullable().optional(),
  im: z.string().max(32).nullable().optional(),
  tax_regime: z.string().max(40).nullable().optional(),
  email: z.string().email().max(160).nullable().optional().or(z.literal("").transform(() => null)),
  phone: z.string().max(40).nullable().optional(),
  website: z.string().max(200).nullable().optional(),
  logo_url: z.string().max(500).nullable().optional(),
  address_street: z.string().max(200).nullable().optional(),
  address_number: z.string().max(20).nullable().optional(),
  address_complement: z.string().max(120).nullable().optional(),
  address_district: z.string().max(120).nullable().optional(),
  address_city: z.string().max(120).nullable().optional(),
  address_state: z.string().max(2).nullable().optional(),
  address_zip: z.string().max(12).nullable().optional(),
  report_footer: z.string().max(500).nullable().optional(),
});

async function assertCompanyAdmin(userId: string, companyId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [{ data: pa }, { data: m }] = await Promise.all([
    supabaseAdmin.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle(),
    supabaseAdmin
      .from("company_members")
      .select("role")
      .eq("user_id", userId)
      .eq("company_id", companyId)
      .maybeSingle(),
  ]);
  if (pa) return;
  if (!m || !["owner", "admin", "manager"].includes(m.role)) {
    throw new Error("Forbidden: insufficient role");
  }
}

export const getCompanyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ companyId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: company, error } = await supabase
      .from("companies")
      .select("*")
      .eq("id", data.companyId)
      .single();
    if (error) throw new Error(error.message);
    return { company };
  });

export const updateCompanyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => upsertSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertCompanyAdmin(context.userId, data.companyId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { companyId, ...patch } = data;
    const { error } = await supabaseAdmin
      .from("companies")
      .update(patch)
      .eq("id", companyId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
