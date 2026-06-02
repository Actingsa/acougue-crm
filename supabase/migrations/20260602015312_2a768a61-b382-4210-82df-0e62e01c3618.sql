
CREATE TABLE public.hardware_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL UNIQUE,

  -- Barcode reader
  barcode_enabled boolean NOT NULL DEFAULT true,
  barcode_mode text NOT NULL DEFAULT 'keyboard', -- keyboard | serial | bluetooth
  barcode_prefix text NOT NULL DEFAULT '',
  barcode_suffix text NOT NULL DEFAULT 'Enter', -- Enter | Tab | None
  barcode_min_length integer NOT NULL DEFAULT 6,
  barcode_max_length integer NOT NULL DEFAULT 48,
  barcode_serial_port text,
  barcode_serial_baud integer DEFAULT 9600,
  barcode_weight_pattern text, -- EAN-13 embedded weight pattern (e.g. 2NNNNN WWWWW C)

  -- Fiscal printer
  printer_enabled boolean NOT NULL DEFAULT false,
  printer_brand text NOT NULL DEFAULT 'bematech', -- bematech | epson | daruma | elgin | sweda | generic_escpos
  printer_model text,
  printer_connection text NOT NULL DEFAULT 'usb', -- usb | serial | ethernet | bluetooth
  printer_serial_port text,
  printer_serial_baud integer DEFAULT 9600,
  printer_ip text,
  printer_port integer DEFAULT 9100,
  printer_paper_width integer NOT NULL DEFAULT 80, -- 58 | 80 mm
  printer_auto_cut boolean NOT NULL DEFAULT true,
  printer_cash_drawer boolean NOT NULL DEFAULT false,
  printer_copies integer NOT NULL DEFAULT 1,
  printer_header text,
  printer_footer text,

  -- SAT / NFC-e (Brasil)
  sat_enabled boolean NOT NULL DEFAULT false,
  sat_activation_code text,
  sat_cnpj text,
  nfce_enabled boolean NOT NULL DEFAULT false,
  nfce_environment text DEFAULT 'homolog', -- homolog | production
  nfce_csc_id text,
  nfce_csc_token text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.hardware_settings TO authenticated;
GRANT ALL ON public.hardware_settings TO service_role;

ALTER TABLE public.hardware_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hw_select_members"
  ON public.hardware_settings FOR SELECT TO authenticated
  USING (public.is_company_member(company_id, auth.uid()));

CREATE POLICY "hw_insert_admins"
  ON public.hardware_settings FOR INSERT TO authenticated
  WITH CHECK (public.has_company_role(company_id, auth.uid(), VARIADIC ARRAY['owner'::app_role,'admin'::app_role,'manager'::app_role]));

CREATE POLICY "hw_update_admins"
  ON public.hardware_settings FOR UPDATE TO authenticated
  USING (public.has_company_role(company_id, auth.uid(), VARIADIC ARRAY['owner'::app_role,'admin'::app_role,'manager'::app_role]));

CREATE POLICY "hw_delete_admins"
  ON public.hardware_settings FOR DELETE TO authenticated
  USING (public.has_company_role(company_id, auth.uid(), VARIADIC ARRAY['owner'::app_role,'admin'::app_role]));

CREATE POLICY "hw_select_platform_admin"
  ON public.hardware_settings FOR SELECT TO authenticated
  USING (public.is_platform_admin(auth.uid()));

CREATE TRIGGER hardware_settings_touch_updated_at
  BEFORE UPDATE ON public.hardware_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
