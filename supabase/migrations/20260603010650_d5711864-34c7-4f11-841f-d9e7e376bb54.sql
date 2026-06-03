CREATE OR REPLACE FUNCTION public.register_purchase(
  _company_id uuid,
  _doc_type purchase_doc_type,
  _doc_number text,
  _doc_series text,
  _doc_key text,
  _supplier_name text,
  _supplier_doc text,
  _issued_at text,
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
  _issued date := NULLIF(_issued_at,'')::date;
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
    _company_id, _doc_type,
    NULLIF(_doc_number,''), NULLIF(_doc_series,''), NULLIF(_doc_key,''),
    NULLIF(_supplier_name,''), NULLIF(_supplier_doc,''),
    _issued, NULLIF(_notes,''), _total, auth.uid()
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
