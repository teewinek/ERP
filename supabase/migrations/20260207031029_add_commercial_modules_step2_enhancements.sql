/*
  # Commercial Modules - Step 2: Enhance Existing Tables
  
  Adds new columns to suppliers, products, and company_settings tables.
*/

-- 1. ENHANCE SUPPLIERS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'suppliers' AND column_name = 'notes'
  ) THEN
    ALTER TABLE suppliers ADD COLUMN notes text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'suppliers' AND column_name = 'company_type'
  ) THEN
    ALTER TABLE suppliers ADD COLUMN company_type text DEFAULT 'entreprise';
  END IF;
END $$;

-- 2. ENHANCE PRODUCTS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'photo_url'
  ) THEN
    ALTER TABLE products ADD COLUMN photo_url text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'destination'
  ) THEN
    ALTER TABLE products ADD COLUMN destination text DEFAULT 'sale';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'product_type'
  ) THEN
    ALTER TABLE products ADD COLUMN product_type text DEFAULT 'product';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'purchase_price'
  ) THEN
    ALTER TABLE products ADD COLUMN purchase_price numeric DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'margin_percent'
  ) THEN
    ALTER TABLE products ADD COLUMN margin_percent numeric DEFAULT 0;
  END IF;
END $$;

-- 3. ENHANCE COMPANY_SETTINGS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_settings' AND column_name = 'cachet_url'
  ) THEN
    ALTER TABLE company_settings ADD COLUMN cachet_url text;
  END IF;
  
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
    ALTER TABLE company_settings ADD COLUMN trust_id text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_settings' AND column_name = 'digigo_config'
  ) THEN
    ALTER TABLE company_settings ADD COLUMN digigo_config jsonb;
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
    WHERE table_name = 'company_settings' AND column_name = 'rn_prefix'
  ) THEN
    ALTER TABLE company_settings ADD COLUMN rn_prefix text DEFAULT 'BR';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_settings' AND column_name = 'rn_next'
  ) THEN
    ALTER TABLE company_settings ADD COLUMN rn_next integer DEFAULT 1;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_settings' AND column_name = 'cn_prefix'
  ) THEN
    ALTER TABLE company_settings ADD COLUMN cn_prefix text DEFAULT 'AV';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_settings' AND column_name = 'cn_next'
  ) THEN
    ALTER TABLE company_settings ADD COLUMN cn_next integer DEFAULT 1;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_settings' AND column_name = 'so_prefix'
  ) THEN
    ALTER TABLE company_settings ADD COLUMN so_prefix text DEFAULT 'CMD';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_settings' AND column_name = 'so_next'
  ) THEN
    ALTER TABLE company_settings ADD COLUMN so_next integer DEFAULT 1;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_settings' AND column_name = 'pdf_footer'
  ) THEN
    ALTER TABLE company_settings ADD COLUMN pdf_footer text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_settings' AND column_name = 'pdf_conditions'
  ) THEN
    ALTER TABLE company_settings ADD COLUMN pdf_conditions text;
  END IF;
END $$;

-- Add foreign key constraints for sales_orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'sales_orders_linked_bl_id_fkey'
  ) THEN
    ALTER TABLE sales_orders
    ADD CONSTRAINT sales_orders_linked_bl_id_fkey
    FOREIGN KEY (linked_bl_id) REFERENCES delivery_notes(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'sales_orders_linked_invoice_id_fkey'
  ) THEN
    ALTER TABLE sales_orders
    ADD CONSTRAINT sales_orders_linked_invoice_id_fkey
    FOREIGN KEY (linked_invoice_id) REFERENCES invoices(id) ON DELETE SET NULL;
  END IF;
END $$;
