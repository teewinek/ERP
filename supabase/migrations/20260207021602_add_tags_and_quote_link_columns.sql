/*
  # Add tags and quote link columns

  1. Modified Tables
    - `invoices` - Add `tags` array and `source_quote_id` reference
    - `purchase_orders` - Add `tags` array
    - `quotes` - Add `converted_invoice_id` reference
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'tags'
  ) THEN
    ALTER TABLE invoices ADD COLUMN tags text[] NOT NULL DEFAULT '{}';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'source_quote_id'
  ) THEN
    ALTER TABLE invoices ADD COLUMN source_quote_id uuid REFERENCES quotes(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchase_orders' AND column_name = 'tags'
  ) THEN
    ALTER TABLE purchase_orders ADD COLUMN tags text[] NOT NULL DEFAULT '{}';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotes' AND column_name = 'converted_invoice_id'
  ) THEN
    ALTER TABLE quotes ADD COLUMN converted_invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL;
  END IF;
END $$;
