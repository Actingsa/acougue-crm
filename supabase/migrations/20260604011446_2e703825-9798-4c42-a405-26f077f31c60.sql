
-- Enum for output classification
DO $$ BEGIN
  CREATE TYPE public.deboning_output_kind AS ENUM ('cut','fat','bone','loss');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Sessions
CREATE TABLE public.deboning_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  carcass_product_id uuid,
  carcass_name text NOT NULL,
  carcass_qty numeric NOT NULL,
  carcass_unit public.product_unit NOT NULL DEFAULT 'kg',
  expected_yield_pct numeric,
  output_cut_qty numeric NOT NULL DEFAULT 0,
  output_fat_qty numeric NOT NULL DEFAULT 0,
  output_bone_qty numeric NOT NULL DEFAULT 0,
  output_loss_qty numeric NOT NULL DEFAULT 0,
  real_yield_pct numeric NOT NULL DEFAULT 0,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.deboning_sessions TO authenticated;
GRANT ALL ON public.deboning_sessions TO service_role;
ALTER TABLE public.deboning_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY deb_sessions_select ON public.deboning_sessions FOR SELECT TO authenticated
  USING (public.is_company_member(company_id, auth.uid()));
CREATE POLICY deb_sessions_select_admin ON public.deboning_sessions FOR SELECT TO authenticated
  USING (public.is_platform_admin(auth.uid()));
CREATE POLICY deb_sessions_insert ON public.deboning_sessions FOR INSERT TO authenticated
  WITH CHECK (public.is_company_member(company_id, auth.uid()) AND created_by = auth.uid());
CREATE POLICY deb_sessions_update ON public.deboning_sessions FOR UPDATE TO authenticated
  USING (public.has_company_role(company_id, auth.uid(), VARIADIC ARRAY['owner'::app_role,'admin'::app_role,'manager'::app_role]));
CREATE POLICY deb_sessions_delete ON public.deboning_sessions FOR DELETE TO authenticated
  USING (public.has_company_role(company_id, auth.uid(), VARIADIC ARRAY['owner'::app_role,'admin'::app_role]));

CREATE TRIGGER deb_sessions_touch BEFORE UPDATE ON public.deboning_sessions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Outputs
CREATE TABLE public.deboning_outputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.deboning_sessions(id) ON DELETE CASCADE,
  company_id uuid NOT NULL,
  product_id uuid,
  name_snapshot text NOT NULL,
  kind public.deboning_output_kind NOT NULL DEFAULT 'cut',
  qty_real numeric NOT NULL DEFAULT 0,
  qty_expected numeric,
  unit public.product_unit NOT NULL DEFAULT 'kg',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.deboning_outputs TO authenticated;
GRANT ALL ON public.deboning_outputs TO service_role;
ALTER TABLE public.deboning_outputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY deb_outputs_select ON public.deboning_outputs FOR SELECT TO authenticated
  USING (public.is_company_member(company_id, auth.uid()));
CREATE POLICY deb_outputs_select_admin ON public.deboning_outputs FOR SELECT TO authenticated
  USING (public.is_platform_admin(auth.uid()));
CREATE POLICY deb_outputs_insert ON public.deboning_outputs FOR INSERT TO authenticated
  WITH CHECK (public.is_company_member(company_id, auth.uid()));
CREATE POLICY deb_outputs_update ON public.deboning_outputs FOR UPDATE TO authenticated
  USING (public.has_company_role(company_id, auth.uid(), VARIADIC ARRAY['owner'::app_role,'admin'::app_role,'manager'::app_role]));
CREATE POLICY deb_outputs_delete ON public.deboning_outputs FOR DELETE TO authenticated
  USING (public.has_company_role(company_id, auth.uid(), VARIADIC ARRAY['owner'::app_role,'admin'::app_role]));

CREATE INDEX deboning_outputs_session_idx ON public.deboning_outputs(session_id);
CREATE INDEX deboning_sessions_company_idx ON public.deboning_sessions(company_id, created_at DESC);

-- RPC: register a deboning session
CREATE OR REPLACE FUNCTION public.register_deboning(
  _company_id uuid,
  _carcass_product_id uuid,
  _carcass_name text,
  _carcass_qty numeric,
  _carcass_unit product_unit,
  _expected_yield_pct numeric,
  _notes text,
  _outputs jsonb
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _session_id uuid;
  _it jsonb;
  _sum_cut numeric := 0;
  _sum_fat numeric := 0;
  _sum_bone numeric := 0;
  _sum_total numeric := 0;
  _loss numeric := 0;
  _yield numeric := 0;
  _pid uuid;
  _qty numeric;
  _kind deboning_output_kind;
BEGIN
  IF NOT public.has_company_role(_company_id, auth.uid(),
        VARIADIC ARRAY['owner'::app_role,'admin'::app_role,'manager'::app_role]) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF _carcass_qty IS NULL OR _carcass_qty <= 0 THEN
    RAISE EXCEPTION 'invalid carcass qty';
  END IF;

  FOR _it IN SELECT * FROM jsonb_array_elements(_outputs) LOOP
    _kind := COALESCE((_it->>'kind')::deboning_output_kind, 'cut');
    _qty := COALESCE((_it->>'qty_real')::numeric, 0);
    _sum_total := _sum_total + _qty;
    IF _kind = 'cut'  THEN _sum_cut  := _sum_cut  + _qty; END IF;
    IF _kind = 'fat'  THEN _sum_fat  := _sum_fat  + _qty; END IF;
    IF _kind = 'bone' THEN _sum_bone := _sum_bone + _qty; END IF;
  END LOOP;

  _loss := GREATEST(_carcass_qty - _sum_total, 0);
  _yield := ROUND((_sum_cut / _carcass_qty) * 100, 2);

  INSERT INTO public.deboning_sessions(
    company_id, carcass_product_id, carcass_name, carcass_qty, carcass_unit,
    expected_yield_pct, output_cut_qty, output_fat_qty, output_bone_qty,
    output_loss_qty, real_yield_pct, notes, created_by
  ) VALUES (
    _company_id, _carcass_product_id, _carcass_name, _carcass_qty, COALESCE(_carcass_unit,'kg'),
    _expected_yield_pct, _sum_cut, _sum_fat, _sum_bone,
    _loss, _yield, NULLIF(_notes,''), auth.uid()
  ) RETURNING id INTO _session_id;

  -- Baixa carcaça
  IF _carcass_product_id IS NOT NULL THEN
    UPDATE public.products
      SET stock_qty = stock_qty - _carcass_qty
      WHERE id = _carcass_product_id AND company_id = _company_id;
    INSERT INTO public.stock_movements(company_id, product_id, kind, qty, reason, user_id)
      VALUES (_company_id, _carcass_product_id, 'out', _carcass_qty,
              'Desossa: baixa de carcaça (sessão ' || _session_id || ')', auth.uid());
  END IF;

  -- Cortes / sebo / osso
  FOR _it IN SELECT * FROM jsonb_array_elements(_outputs) LOOP
    _pid := NULLIF(_it->>'product_id','')::uuid;
    _qty := COALESCE((_it->>'qty_real')::numeric, 0);
    _kind := COALESCE((_it->>'kind')::deboning_output_kind, 'cut');

    INSERT INTO public.deboning_outputs(
      session_id, company_id, product_id, name_snapshot, kind, qty_real, qty_expected, unit
    ) VALUES (
      _session_id, _company_id, _pid, _it->>'name', _kind, _qty,
      NULLIF(_it->>'qty_expected','')::numeric,
      COALESCE((_it->>'unit')::product_unit,'kg')
    );

    IF _pid IS NOT NULL AND _qty > 0 THEN
      UPDATE public.products
        SET stock_qty = stock_qty + _qty
        WHERE id = _pid AND company_id = _company_id;
      INSERT INTO public.stock_movements(company_id, product_id, kind, qty, reason, user_id)
        VALUES (_company_id, _pid, 'in', _qty,
                'Desossa: ' || _kind::text || ' (sessão ' || _session_id || ')', auth.uid());
    END IF;
  END LOOP;

  -- Registro de perda/quebra
  IF _loss > 0 THEN
    INSERT INTO public.deboning_outputs(
      session_id, company_id, name_snapshot, kind, qty_real, unit
    ) VALUES (
      _session_id, _company_id, 'Quebra / Perda', 'loss', _loss, COALESCE(_carcass_unit,'kg')
    );
  END IF;

  RETURN _session_id;
END $$;
