import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertCompanyAdmin(userId: string, companyId: string) {
  const { data: admin } = await supabaseAdmin
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (admin) return;
  const { data: mem, error } = await supabaseAdmin
    .from("company_members")
    .select("role")
    .eq("user_id", userId)
    .eq("company_id", companyId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!mem || (mem.role !== "owner" && mem.role !== "admin")) {
    throw new Error("Forbidden: requires owner or admin role");
  }
}

export const teamCreateMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        companyId: z.string().uuid(),
        email: z.string().email(),
        name: z.string().min(2).max(120),
        password: z.string().min(8).max(128),
        role: z.enum(["owner", "admin", "manager", "cashier", "butcher"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertCompanyAdmin(context.userId, data.companyId);

    // Seat enforcement
    const { data: company } = await supabaseAdmin
      .from("companies")
      .select("license_seats, license_status")
      .eq("id", data.companyId)
      .single();
    if (!company) throw new Error("Company not found");
    const { count } = await supabaseAdmin
      .from("company_members")
      .select("*", { count: "exact", head: true })
      .eq("company_id", data.companyId);
    if ((count ?? 0) >= company.license_seats) {
      throw new Error(
        `Limite de assentos atingido (${company.license_seats}). Solicite ampliação ao Superadmin.`,
      );
    }

    let userId: string | null = null;
    const { data: created, error: createErr } =
      await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
        user_metadata: { full_name: data.name },
      });

    if (createErr) {
      if (/already/i.test(createErr.message)) {
        const { data: list } = await supabaseAdmin.auth.admin.listUsers({
          page: 1,
          perPage: 200,
        });
        const found = list?.users.find(
          (u) => u.email?.toLowerCase() === data.email.toLowerCase(),
        );
        if (!found) throw new Error(createErr.message);
        userId = found.id;
      } else {
        throw new Error(createErr.message);
      }
    } else {
      userId = created.user!.id;
    }

    await supabaseAdmin.from("profiles").upsert(
      { id: userId!, email: data.email, full_name: data.name },
      { onConflict: "id" },
    );

    const { error: mErr } = await supabaseAdmin.from("company_members").insert({
      company_id: data.companyId,
      user_id: userId!,
      role: data.role,
    });
    if (mErr) throw new Error(mErr.message);

    return { ok: true, userId };
  });

export const teamUpdateRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        companyId: z.string().uuid(),
        memberId: z.string().uuid(),
        role: z.enum(["owner", "admin", "manager", "cashier", "butcher"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertCompanyAdmin(context.userId, data.companyId);
    const { error } = await supabaseAdmin
      .from("company_members")
      .update({ role: data.role })
      .eq("id", data.memberId)
      .eq("company_id", data.companyId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const teamRemoveMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        companyId: z.string().uuid(),
        memberId: z.string().uuid(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertCompanyAdmin(context.userId, data.companyId);
    const { error } = await supabaseAdmin
      .from("company_members")
      .delete()
      .eq("id", data.memberId)
      .eq("company_id", data.companyId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const teamListMembers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ companyId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertCompanyAdmin(context.userId, data.companyId);
    const { data: members, error } = await supabaseAdmin
      .from("company_members")
      .select("id, user_id, role, created_at")
      .eq("company_id", data.companyId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    const ids = (members ?? []).map((m) => m.user_id);
    const { data: profiles } = ids.length
      ? await supabaseAdmin.from("profiles").select("id, email, full_name").in("id", ids)
      : { data: [] as { id: string; email: string | null; full_name: string | null }[] };
    const map = new Map((profiles ?? []).map((p) => [p.id, p]));
    return {
      members: (members ?? []).map((m) => ({
        ...m,
        email: map.get(m.user_id)?.email ?? null,
        full_name: map.get(m.user_id)?.full_name ?? null,
      })),
    };
  });

