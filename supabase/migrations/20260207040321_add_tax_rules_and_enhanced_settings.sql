/*
  # Add Tax Rules and Enhanced Company Settings

  1. New Tables
    - `tax_rules`
      - `id` (uuid, primary key)
      - `name` (text) - Tax name (e.g., TVA 19%, FODEC 1%)
      - `rate` (numeric) - Tax rate percentage
      - `type` (text) - Tax type: tva, fodec, other
      - `is_active` (boolean) - Whether the tax is active
      - `is_default` (boolean) - Whether this is a default tax
      - `created_at` (timestamptz)

  2. Modified Tables
    - `company_settings` - Added columns for TTN, QR code, caching, document prefixes

  3. Security
    - Enable RLS on `tax_rules`
    - Policies for authenticated user CRUD
*/

CREATE TABLE IF NOT EXISTS tax_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  rate numeric NOT NULL DEFAULT 0,
  type text NOT NULL DEFAULT 'tva',
  is_active boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE tax_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view tax rules"
  ON tax_rules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert tax rules"
  ON tax_rules FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update tax rules"
  ON tax_rules FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete tax rules"
  ON tax_rules FOR DELETE
  TO authenticated
  USING (true);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_settings' AND column_name = 'ttn_enabled'
  ) THEN
    ALTER TABLE company_settings ADD COLUMN ttn_enabled boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_settings' AND column_name = 'trust_id'
  ) THEN
    ALTER TABLE company_settings ADD COLUMN trust_id text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_settings' AND column_name = 'digigo_config'
  ) THEN
    ALTER TABLE company_settings ADD COLUMN digigo_config jsonb DEFAULT '{}';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_settings' AND column_name = 'show_qr_code'
  ) THEN
    ALTER TABLE company_settings ADD COLUMN show_qr_code boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_settings' AND column_name = 'decimals'
  ) THEN
    ALTER TABLE company_settings ADD COLUMN decimals integer DEFAULT 3;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_settings' AND column_name = 'cachet_url'
  ) THEN
    ALTER TABLE company_settings ADD COLUMN cachet_url text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_settings' AND column_name = 'rn_prefix'
  ) THEN
    ALTER TABLE company_settings ADD COLUMN rn_prefix text DEFAULT 'BR';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_settings' AND column_name = 'cn_prefix'
  ) THEN
    ALTER TABLE company_settings ADD COLUMN cn_prefix text DEFAULT 'AV';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_settings' AND column_name = 'so_prefix'
  ) THEN
    ALTER TABLE company_settings ADD COLUMN so_prefix text DEFAULT 'CMD';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_settings' AND column_name = 'rn_next'
  ) THEN
    ALTER TABLE company_settings ADD COLUMN rn_next integer DEFAULT 1;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_settings' AND column_name = 'cn_next'
  ) THEN
    ALTER TABLE company_settings ADD COLUMN cn_next integer DEFAULT 1;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_settings' AND column_name = 'so_next'
  ) THEN
    ALTER TABLE company_settings ADD COLUMN so_next integer DEFAULT 1;
  END IF;
END $$;

INSERT INTO tax_rules (name, rate, type, is_active, is_default) VALUES
  ('TVA 19%', 19, 'tva', true, true),
  ('TVA 7%', 7, 'tva', true, false),
  ('TVA 13%', 13, 'tva', true, false),
  ('FODEC 1%', 1, 'fodec', true, false)
ON CONFLICT DO NOTHING;
