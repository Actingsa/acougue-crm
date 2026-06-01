import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertPlatformAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: not a platform admin");
}

function slugify(name: string, suffix: string) {
  return (
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 40) +
    "-" +
    suffix.slice(0, 6)
  );
}

export const adminListCompanies = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertPlatformAdmin(context.userId);
    const { data: companies, error } = await supabaseAdmin
      .from("companies")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const { data: members } = await supabaseAdmin
      .from("company_members")
      .select("company_id, user_id, role");

    return { companies: companies ?? [], members: members ?? [] };
  });

export const adminCreateCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        companyName: z.string().min(2).max(120),
        cnpj: z.string().max(20).optional().nullable(),
        plan: z.enum(["trial", "basic", "pro", "enterprise"]).default("trial"),
        licenseStatus: z
          .enum(["trial", "active", "suspended", "expired", "cancelled"])
          .default("trial"),
        licenseSeats: z.number().int().min(1).max(500).default(5),
        licenseExpiresAt: z.string().datetime().optional().nullable(),
        ownerEmail: z.string().email(),
        ownerName: z.string().min(2).max(120),
        ownerPassword: z.string().min(8).max(128),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertPlatformAdmin(context.userId);

    // Create or find auth user
    let ownerId: string | null = null;
    const { data: created, error: createErr } =
      await supabaseAdmin.auth.admin.createUser({
        email: data.ownerEmail,
        password: data.ownerPassword,
        email_confirm: true,
        user_metadata: { full_name: data.ownerName, company_name: data.companyName },
      });

    if (createErr) {
      // If user exists, look it up
      if (/already/i.test(createErr.message)) {
        const { data: list } = await supabaseAdmin.auth.admin.listUsers({
          page: 1,
          perPage: 200,
        });
        const found = list?.users.find(
          (u) => u.email?.toLowerCase() === data.ownerEmail.toLowerCase(),
        );
        if (!found) throw new Error(createErr.message);
        ownerId = found.id;
      } else {
        throw new Error(createErr.message);
      }
    } else {
      ownerId = created.user!.id;
    }

    // Insert company
    const slug = slugify(data.companyName, ownerId!);
    const { data: company, error: cErr } = await supabaseAdmin
      .from("companies")
      .insert({
        name: data.companyName,
        slug,
        cnpj: data.cnpj || null,
        plan: data.plan,
        license_status: data.licenseStatus,
        license_seats: data.licenseSeats,
        license_expires_at: data.licenseExpiresAt || null,
        created_by: ownerId!,
      })
      .select("*")
      .single();
    if (cErr) throw new Error(cErr.message);

    // Add owner membership
    const { error: mErr } = await supabaseAdmin.from("company_members").insert({
      company_id: company.id,
      user_id: ownerId!,
      role: "owner",
    });
    if (mErr) throw new Error(mErr.message);

    // Ensure profile + set current_company
    await supabaseAdmin.from("profiles").upsert(
      {
        id: ownerId!,
        email: data.ownerEmail,
        full_name: data.ownerName,
        current_company_id: company.id,
      },
      { onConflict: "id" },
    );

    return { company };
  });

export const adminUpdateLicense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        companyId: z.string().uuid(),
        plan: z.enum(["trial", "basic", "pro", "enterprise"]).optional(),
        licenseStatus: z
          .enum(["trial", "active", "suspended", "expired", "cancelled"])
          .optional(),
        licenseSeats: z.number().int().min(1).max(500).optional(),
        licenseExpiresAt: z.string().datetime().nullable().optional(),
        licenseNotes: z.string().max(2000).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertPlatformAdmin(context.userId);
    const patch: Record<string, unknown> = {};
    if (data.plan !== undefined) patch.plan = data.plan;
    if (data.licenseStatus !== undefined) patch.license_status = data.licenseStatus;
    if (data.licenseSeats !== undefined) patch.license_seats = data.licenseSeats;
    if (data.licenseExpiresAt !== undefined)
      patch.license_expires_at = data.licenseExpiresAt;
    if (data.licenseNotes !== undefined) patch.license_notes = data.licenseNotes;

    const { error } = await supabaseAdmin
      .from("companies")
      .update(patch)
      .eq("id", data.companyId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ companyId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertPlatformAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("companies")
      .delete()
      .eq("id", data.companyId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
