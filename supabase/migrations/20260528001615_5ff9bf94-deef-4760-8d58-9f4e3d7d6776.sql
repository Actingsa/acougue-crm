
-- ENUMS
CREATE TYPE public.product_unit AS ENUM ('kg','un');
CREATE TYPE public.stock_kind AS ENUM ('in','out','loss','adjust','butcher');
CREATE TYPE public.sale_status AS ENUM ('open','paid','cancelled');
CREATE TYPE public.pay_method AS ENUM ('cash','debit','credit','pix','voucher');
CREATE TYPE public.cash_status AS ENUM ('open','closed');

-- PRODUCTS
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  sku text,
  barcode text,
  name text NOT NULL,
  category text,
  unit public.product_unit NOT NULL DEFAULT 'kg',
  price_cents integer NOT NULL DEFAULT 0,
  cost_cents integer NOT NULL DEFAULT 0,
  stock_qty numeric(12,3) NOT NULL DEFAULT 0,
  min_stock numeric(12,3) NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_products_company ON public.products(company_id);
CREATE INDEX idx_products_barcode ON public.products(company_id, barcode);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY products_select ON public.products FOR SELECT TO authenticated USING (public.is_company_member(company_id, auth.uid()));
CREATE POLICY products_insert ON public.products FOR INSERT TO authenticated WITH CHECK (public.is_company_member(company_id, auth.uid()));
CREATE POLICY products_update ON public.products FOR UPDATE TO authenticated USING (public.is_company_member(company_id, auth.uid()));
CREATE POLICY products_delete ON public.products FOR DELETE TO authenticated USING (public.has_company_role(company_id, auth.uid(), VARIADIC ARRAY['owner','admin','manager']::app_role[]));
CREATE TRIGGER tr_products_updated BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- CUSTOMERS
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  doc text,
  phone text,
  email text,
  credit_limit_cents integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_customers_company ON public.customers(company_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY customers_select ON public.customers FOR SELECT TO authenticated USING (public.is_company_member(company_id, auth.uid()));
CREATE POLICY customers_insert ON public.customers FOR INSERT TO authenticated WITH CHECK (public.is_company_member(company_id, auth.uid()));
CREATE POLICY customers_update ON public.customers FOR UPDATE TO authenticated USING (public.is_company_member(company_id, auth.uid()));
CREATE POLICY customers_delete ON public.customers FOR DELETE TO authenticated USING (public.has_company_role(company_id, auth.uid(), VARIADIC ARRAY['owner','admin','manager']::app_role[]));
CREATE TRIGGER tr_customers_updated BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- CASH SESSIONS
CREATE TABLE public.cash_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  terminal text NOT NULL DEFAULT 'PDV-01',
  opened_by uuid NOT NULL,
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  opening_cents integer NOT NULL DEFAULT 0,
  closing_cents integer,
  status public.cash_status NOT NULL DEFAULT 'open'
);
CREATE INDEX idx_cash_company ON public.cash_sessions(company_id, status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_sessions TO authenticated;
GRANT ALL ON public.cash_sessions TO service_role;
ALTER TABLE public.cash_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY cash_select ON public.cash_sessions FOR SELECT TO authenticated USING (public.is_company_member(company_id, auth.uid()));
CREATE POLICY cash_insert ON public.cash_sessions FOR INSERT TO authenticated WITH CHECK (public.is_company_member(company_id, auth.uid()) AND opened_by = auth.uid());
CREATE POLICY cash_update ON public.cash_sessions FOR UPDATE TO authenticated USING (public.is_company_member(company_id, auth.uid()));

-- SALES
CREATE TABLE public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  number bigserial,
  client_uuid text,
  terminal text NOT NULL DEFAULT 'PDV-01',
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  cashier_id uuid NOT NULL,
  cash_session_id uuid REFERENCES public.cash_sessions(id) ON DELETE SET NULL,
  subtotal_cents integer NOT NULL DEFAULT 0,
  discount_cents integer NOT NULL DEFAULT 0,
  total_cents integer NOT NULL DEFAULT 0,
  pay_method public.pay_method NOT NULL DEFAULT 'cash',
  status public.sale_status NOT NULL DEFAULT 'paid',
  synced_offline boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, client_uuid)
);
CREATE INDEX idx_sales_company_date ON public.sales(company_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales TO authenticated;
GRANT ALL ON public.sales TO service_role;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY sales_select ON public.sales FOR SELECT TO authenticated USING (public.is_company_member(company_id, auth.uid()));
CREATE POLICY sales_insert ON public.sales FOR INSERT TO authenticated WITH CHECK (public.is_company_member(company_id, auth.uid()) AND cashier_id = auth.uid());
CREATE POLICY sales_update ON public.sales FOR UPDATE TO authenticated USING (public.has_company_role(company_id, auth.uid(), VARIADIC ARRAY['owner','admin','manager']::app_role[]));

-- SALE ITEMS
CREATE TABLE public.sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  name_snapshot text NOT NULL,
  qty numeric(12,3) NOT NULL,
  unit public.product_unit NOT NULL DEFAULT 'kg',
  unit_price_cents integer NOT NULL,
  total_cents integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_items_sale ON public.sale_items(sale_id);
CREATE INDEX idx_items_company ON public.sale_items(company_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sale_items TO authenticated;
GRANT ALL ON public.sale_items TO service_role;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY items_select ON public.sale_items FOR SELECT TO authenticated USING (public.is_company_member(company_id, auth.uid()));
CREATE POLICY items_insert ON public.sale_items FOR INSERT TO authenticated WITH CHECK (public.is_company_member(company_id, auth.uid()));

-- STOCK MOVEMENTS
CREATE TABLE public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  kind public.stock_kind NOT NULL,
  qty numeric(12,3) NOT NULL,
  reason text,
  lot text,
  expires_at date,
  sale_id uuid REFERENCES public.sales(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_stock_company_date ON public.stock_movements(company_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_movements TO authenticated;
GRANT ALL ON public.stock_movements TO service_role;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY stock_select ON public.stock_movements FOR SELECT TO authenticated USING (public.is_company_member(company_id, auth.uid()));
CREATE POLICY stock_insert ON public.stock_movements FOR INSERT TO authenticated WITH CHECK (public.is_company_member(company_id, auth.uid()) AND user_id = auth.uid());

-- RPC: register a sale atomically (debits stock, snapshots items)
CREATE OR REPLACE FUNCTION public.register_sale(
  _company_id uuid,
  _client_uuid text,
  _terminal text,
  _customer_id uuid,
  _pay_method public.pay_method,
  _discount_cents integer,
  _items jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _sale_id uuid;
  _subtotal integer := 0;
  _it jsonb;
  _existing uuid;
BEGIN
  IF NOT public.is_company_member(_company_id, auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- Idempotent on client_uuid
  IF _client_uuid IS NOT NULL THEN
    SELECT id INTO _existing FROM public.sales
      WHERE company_id = _company_id AND client_uuid = _client_uuid;
    IF _existing IS NOT NULL THEN RETURN _existing; END IF;
  END IF;

  FOR _it IN SELECT * FROM jsonb_array_elements(_items) LOOP
    _subtotal := _subtotal + ((_it->>'total_cents')::int);
  END LOOP;

  INSERT INTO public.sales(company_id, client_uuid, terminal, customer_id, cashier_id, subtotal_cents, discount_cents, total_cents, pay_method, status, synced_offline)
  VALUES (_company_id, _client_uuid, COALESCE(_terminal,'PDV-01'), _customer_id, auth.uid(), _subtotal, COALESCE(_discount_cents,0), _subtotal - COALESCE(_discount_cents,0), _pay_method, 'paid', _client_uuid IS NOT NULL)
  RETURNING id INTO _sale_id;

  FOR _it IN SELECT * FROM jsonb_array_elements(_items) LOOP
    INSERT INTO public.sale_items(sale_id, company_id, product_id, name_snapshot, qty, unit, unit_price_cents, total_cents)
    VALUES (
      _sale_id, _company_id,
      NULLIF(_it->>'product_id','')::uuid,
      _it->>'name',
      (_it->>'qty')::numeric,
      COALESCE((_it->>'unit')::public.product_unit,'kg'),
      (_it->>'unit_price_cents')::int,
      (_it->>'total_cents')::int
    );

    IF NULLIF(_it->>'product_id','') IS NOT NULL THEN
      UPDATE public.products
        SET stock_qty = stock_qty - (_it->>'qty')::numeric
        WHERE id = (_it->>'product_id')::uuid AND company_id = _company_id;

      INSERT INTO public.stock_movements(company_id, product_id, kind, qty, reason, sale_id, user_id)
      VALUES (_company_id, (_it->>'product_id')::uuid, 'out', (_it->>'qty')::numeric, 'sale', _sale_id, auth.uid());
    END IF;
  END LOOP;

  RETURN _sale_id;
END $$;

GRANT EXECUTE ON FUNCTION public.register_sale(uuid, text, text, uuid, public.pay_method, integer, jsonb) TO authenticated;
