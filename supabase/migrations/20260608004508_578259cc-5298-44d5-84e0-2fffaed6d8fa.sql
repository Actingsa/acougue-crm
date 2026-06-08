CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  name text NOT NULL,
  legal_name text,
  doc text,
  ie text,
  email text,
  phone text,
  contact_name text,
  notes text,
  address_zip text,
  address_street text,
  address_number text,
  address_complement text,
  address_district text,
  address_city text,
  address_state text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;
GRANT ALL ON public.suppliers TO service_role;

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY suppliers_select ON public.suppliers FOR SELECT TO authenticated
  USING (public.is_company_member(company_id, auth.uid()));
CREATE POLICY suppliers_select_platform_admin ON public.suppliers FOR SELECT TO authenticated
  USING (public.is_platform_admin(auth.uid()));
CREATE POLICY suppliers_insert ON public.suppliers FOR INSERT TO authenticated
  WITH CHECK (public.is_company_member(company_id, auth.uid()));
CREATE POLICY suppliers_update ON public.suppliers FOR UPDATE TO authenticated
  USING (public.is_company_member(company_id, auth.uid()));
CREATE POLICY suppliers_delete ON public.suppliers FOR DELETE TO authenticated
  USING (public.has_company_role(company_id, auth.uid(),
    VARIADIC ARRAY['owner'::app_role,'admin'::app_role,'manager'::app_role]));

CREATE TRIGGER suppliers_touch_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX suppliers_company_idx ON public.suppliers(company_id);