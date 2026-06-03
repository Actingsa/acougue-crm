-- 1) Extend companies with personalization + fiscal data
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS legal_name text,
  ADD COLUMN IF NOT EXISTS trade_name text,
  ADD COLUMN IF NOT EXISTS ie text,
  ADD COLUMN IF NOT EXISTS im text,
  ADD COLUMN IF NOT EXISTS tax_regime text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS address_street text,
  ADD COLUMN IF NOT EXISTS address_number text,
  ADD COLUMN IF NOT EXISTS address_complement text,
  ADD COLUMN IF NOT EXISTS address_district text,
  ADD COLUMN IF NOT EXISTS address_city text,
  ADD COLUMN IF NOT EXISTS address_state text,
  ADD COLUMN IF NOT EXISTS address_zip text,
  ADD COLUMN IF NOT EXISTS report_footer text;

-- 2) Purchase invoices (entries of products into stock)
DO $$ BEGIN
  CREATE TYPE purchase_doc_type AS ENUM ('nfe','nfce','cupom','non_fiscal');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.purchase_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  doc_type purchase_doc_type NOT NULL DEFAULT 'non_fiscal',
  doc_number text,
  doc_series text,
  doc_key text,
  supplier_name text,
  supplier_doc text,
  issued_at date,
  received_at timestamptz NOT NULL DEFAULT now(),
  total_cents integer NOT NULL DEFAULT 0,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_invoices TO authenticated;
GRANT ALL ON public.purchase_invoices TO service_role;
ALTER TABLE public.purchase_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY purchases_select ON public.purchase_invoices
  FOR SELECT TO authenticated
  USING (public.is_company_member(company_id, auth.uid()));
CREATE POLICY purchases_insert ON public.purchase_invoices
  FOR INSERT TO authenticated
  WITH CHECK (public.is_company_member(company_id, auth.uid()) AND created_by = auth.uid());
CREATE POLICY purchases_update ON public.purchase_invoices
  FOR UPDATE TO authenticated
  USING (public.has_company_role(company_id, auth.uid(), VARIADIC ARRAY['owner'::app_role,'admin'::app_role,'manager'::app_role]));
CREATE POLICY purchases_delete ON public.purchase_invoices
  FOR DELETE TO authenticated
  USING (public.has_company_role(company_id, auth.uid(), VARIADIC ARRAY['owner'::app_role,'admin'::app_role]));
CREATE POLICY purchases_select_admin ON public.purchase_invoices
  FOR SELECT TO authenticated
  USING (public.is_platform_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_purchases_company ON public.purchase_invoices(company_id, received_at DESC);

-- 3) Purchase invoice items
CREATE TABLE IF NOT EXISTS public.purchase_invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.purchase_invoices(id) ON DELETE CASCADE,
  company_id uuid NOT NULL,
  product_id uuid,
  name_snapshot text NOT NULL,
  qty numeric NOT NULL,
  unit product_unit NOT NULL DEFAULT 'kg',
  unit_cost_cents integer NOT NULL DEFAULT 0,
  total_cents integer NOT NULL DEFAULT 0,
  lot text,
  expires_at date,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_invoice_items TO authenticated;
GRANT ALL ON public.purchase_invoice_items TO service_role;
ALTER TABLE public.purchase_invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY pii_select ON public.purchase_invoice_items
  FOR SELECT TO authenticated USING (public.is_company_member(company_id, auth.uid()));
CREATE POLICY pii_insert ON public.purchase_invoice_items
  FOR INSERT TO authenticated WITH CHECK (public.is_company_member(company_id, auth.uid()));
CREATE POLICY pii_update ON public.purchase_invoice_items
  FOR UPDATE TO authenticated USING (public.is_company_member(company_id, auth.uid()));
CREATE POLICY pii_delete ON public.purchase_invoice_items
  FOR DELETE TO authenticated USING (public.is_company_member(company_id, auth.uid()));
CREATE POLICY pii_select_admin ON public.purchase_invoice_items
  FOR SELECT TO authenticated USING (public.is_platform_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_pii_invoice ON public.purchase_invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_pii_company ON public.purchase_invoice_items(company_id);

CREATE TRIGGER purchase_invoices_touch
  BEFORE UPDATE ON public.purchase_invoices
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 4) RPC to register a purchase atomically: insert invoice + items + stock movements + update product stock
CREATE OR REPLACE FUNCTION public.register_purchase(
  _company_id uuid,
  _doc_type purchase_doc_type,
  _doc_number text,
  _doc_series text,
  _doc_key text,
  _supplier_name text,
  _supplier_doc text,
  _issued_at date,
  _notes text,
  _items jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _invoice_id uuid;
  _it jsonb;
  _total integer := 0;
  _pid uuid;
  _qty numeric;
  _unit product_unit;
  _unit_cost integer;
  _line_total integer;
BEGIN
  IF NOT public.is_company_member(_company_id, auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  FOR _it IN SELECT * FROM jsonb_array_elements(_items) LOOP
    _total := _total + ((_it->>'total_cents')::int);
  END LOOP;

  INSERT INTO public.purchase_invoices(
    company_id, doc_type, doc_number, doc_series, doc_key,
    supplier_name, supplier_doc, issued_at, notes, total_cents, created_by
  ) VALUES (
    _company_id, _doc_type, _doc_number, _doc_series, _doc_key,
    _supplier_name, _supplier_doc, _issued_at, _notes, _total, auth.uid()
  ) RETURNING id INTO _invoice_id;

  FOR _it IN SELECT * FROM jsonb_array_elements(_items) LOOP
    _pid := NULLIF(_it->>'product_id','')::uuid;
    _qty := (_it->>'qty')::numeric;
    _unit := COALESCE((_it->>'unit')::product_unit,'kg');
    _unit_cost := COALESCE((_it->>'unit_cost_cents')::int, 0);
    _line_total := COALESCE((_it->>'total_cents')::int, 0);

    INSERT INTO public.purchase_invoice_items(
      invoice_id, company_id, product_id, name_snapshot, qty, unit, unit_cost_cents, total_cents, lot, expires_at
    ) VALUES (
      _invoice_id, _company_id, _pid, _it->>'name', _qty, _unit, _unit_cost, _line_total,
      NULLIF(_it->>'lot',''), NULLIF(_it->>'expires_at','')::date
    );

    IF _pid IS NOT NULL THEN
      UPDATE public.products
        SET stock_qty = stock_qty + _qty,
            cost_cents = CASE WHEN _unit_cost > 0 THEN _unit_cost ELSE cost_cents END
        WHERE id = _pid AND company_id = _company_id;

      INSERT INTO public.stock_movements(company_id, product_id, kind, qty, reason, user_id, lot, expires_at)
      VALUES (_company_id, _pid, 'in', _qty,
              CASE _doc_type
                WHEN 'nfe' THEN 'Entrada via NF-e ' || COALESCE(_doc_number,'')
                WHEN 'nfce' THEN 'Entrada via NFC-e ' || COALESCE(_doc_number,'')
                WHEN 'cupom' THEN 'Entrada via Cupom Fiscal ' || COALESCE(_doc_number,'')
                ELSE 'Entrada não fiscal'
              END,
              auth.uid(), NULLIF(_it->>'lot',''), NULLIF(_it->>'expires_at','')::date);
    END IF;
  END LOOP;

  RETURN _invoice_id;
END $$;
