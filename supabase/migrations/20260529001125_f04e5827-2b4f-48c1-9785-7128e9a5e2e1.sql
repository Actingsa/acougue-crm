
-- License status on companies
DO $$ BEGIN
  CREATE TYPE public.license_status AS ENUM ('trial','active','inactive','suspended');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS license_status public.license_status NOT NULL DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS license_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS license_seats integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS license_notes text;

-- Platform admins (SaaS owners)
CREATE TABLE IF NOT EXISTS public.platform_admins (
  user_id uuid PRIMARY KEY,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

GRANT SELECT ON public.platform_admins TO authenticated;
GRANT ALL ON public.platform_admins TO service_role;
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = _user_id);
$$;

CREATE OR REPLACE FUNCTION public.company_license_active(_company_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.companies
    WHERE id = _company_id
      AND license_status IN ('trial','active')
      AND (license_expires_at IS NULL OR license_expires_at > now())
  );
$$;

-- Platform admins can read/manage everything
DROP POLICY IF EXISTS platform_admins_select ON public.platform_admins;
CREATE POLICY platform_admins_select ON public.platform_admins
  FOR SELECT TO authenticated USING (public.is_platform_admin(auth.uid()) OR user_id = auth.uid());

DROP POLICY IF EXISTS platform_admins_manage ON public.platform_admins;
CREATE POLICY platform_admins_manage ON public.platform_admins
  FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

-- Extend companies: platform admin sees and updates all
DROP POLICY IF EXISTS companies_select_platform_admin ON public.companies;
CREATE POLICY companies_select_platform_admin ON public.companies
  FOR SELECT TO authenticated USING (public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS companies_update_platform_admin ON public.companies;
CREATE POLICY companies_update_platform_admin ON public.companies
  FOR UPDATE TO authenticated USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS companies_insert_platform_admin ON public.companies;
CREATE POLICY companies_insert_platform_admin ON public.companies
  FOR INSERT TO authenticated WITH CHECK (public.is_platform_admin(auth.uid()) OR auth.uid() = created_by);

DROP POLICY IF EXISTS companies_delete_platform_admin ON public.companies;
CREATE POLICY companies_delete_platform_admin ON public.companies
  FOR DELETE TO authenticated USING (public.is_platform_admin(auth.uid()));

-- Profiles: platform admin can read/update all
DROP POLICY IF EXISTS profiles_select_platform_admin ON public.profiles;
CREATE POLICY profiles_select_platform_admin ON public.profiles
  FOR SELECT TO authenticated USING (public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS profiles_update_platform_admin ON public.profiles;
CREATE POLICY profiles_update_platform_admin ON public.profiles
  FOR UPDATE TO authenticated USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

-- Company members: platform admin manages all
DROP POLICY IF EXISTS members_select_platform_admin ON public.company_members;
CREATE POLICY members_select_platform_admin ON public.company_members
  FOR SELECT TO authenticated USING (public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS members_insert_platform_admin ON public.company_members;
CREATE POLICY members_insert_platform_admin ON public.company_members
  FOR INSERT TO authenticated WITH CHECK (public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS members_update_platform_admin ON public.company_members;
CREATE POLICY members_update_platform_admin ON public.company_members
  FOR UPDATE TO authenticated USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS members_delete_platform_admin ON public.company_members;
CREATE POLICY members_delete_platform_admin ON public.company_members
  FOR DELETE TO authenticated USING (public.is_platform_admin(auth.uid()));

-- Platform admin reads everything across operational tables
DROP POLICY IF EXISTS products_select_platform_admin ON public.products;
CREATE POLICY products_select_platform_admin ON public.products
  FOR SELECT TO authenticated USING (public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS sales_select_platform_admin ON public.sales;
CREATE POLICY sales_select_platform_admin ON public.sales
  FOR SELECT TO authenticated USING (public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS sale_items_select_platform_admin ON public.sale_items;
CREATE POLICY sale_items_select_platform_admin ON public.sale_items
  FOR SELECT TO authenticated USING (public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS stock_select_platform_admin ON public.stock_movements;
CREATE POLICY stock_select_platform_admin ON public.stock_movements
  FOR SELECT TO authenticated USING (public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS customers_select_platform_admin ON public.customers;
CREATE POLICY customers_select_platform_admin ON public.customers
  FOR SELECT TO authenticated USING (public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS cash_select_platform_admin ON public.cash_sessions;
CREATE POLICY cash_select_platform_admin ON public.cash_sessions
  FOR SELECT TO authenticated USING (public.is_platform_admin(auth.uid()));

-- Seed: clessiors@gmail.com as platform admin (super owner)
INSERT INTO public.platform_admins (user_id, email)
VALUES ('17d1c9cf-5f39-4b69-8911-7b4bdfde1cf4','clessiors@gmail.com')
ON CONFLICT (user_id) DO NOTHING;
