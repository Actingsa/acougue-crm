-- Adiciona campos para integração com leitor de código de barras e balança digital
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS plu_code text,
  ADD COLUMN IF NOT EXISTS is_weighable boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tare_grams integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS package_grams integer,
  ADD COLUMN IF NOT EXISTS scale_prefix text;

CREATE UNIQUE INDEX IF NOT EXISTS products_company_barcode_uniq
  ON public.products (company_id, barcode) WHERE barcode IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS products_company_plu_uniq
  ON public.products (company_id, plu_code) WHERE plu_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS products_company_sku_idx
  ON public.products (company_id, sku) WHERE sku IS NOT NULL;
CREATE INDEX IF NOT EXISTS products_company_scale_prefix_idx
  ON public.products (company_id, scale_prefix) WHERE scale_prefix IS NOT NULL;

COMMENT ON COLUMN public.products.plu_code IS 'Código curto digitado no PDV (atalho)';
COMMENT ON COLUMN public.products.is_weighable IS 'Produto pesável (balança)';
COMMENT ON COLUMN public.products.tare_grams IS 'Tara da embalagem em gramas';
COMMENT ON COLUMN public.products.package_grams IS 'Peso fixo da embalagem (produtos pré-embalados)';
COMMENT ON COLUMN public.products.scale_prefix IS 'Prefixo do EAN-13 da balança (ex: 20 + 5 dígitos PLU + 5 peso + DV)';