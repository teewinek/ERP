/*
  # Add FODEC/Timbre/Token to Invoices + user_id to modules

  1. Modified Tables
    - `invoices`: add fodec_rate, fodec_amount, timbre_amount, public_token (unique)
    - `credit_notes`: add user_id column for RLS ownership
    - `return_orders`: add user_id column for RLS ownership
    - `sales_orders`: add user_id column for RLS ownership
    - `delivery_notes`: add updated_at column
    - `company_settings`: add invoice_template column

  2. Security
    - New RLS policies for credit_notes, return_orders, sales_orders scoped by user_id
    - Drop old permissive policies and recreate with ownership checks

  3. Indexes
    - public_token unique index on invoices
    - user_id indexes on credit_notes, return_orders, sales_orders
*/

-- 1. Add FODEC/Timbre/Token to invoices
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'fodec_rate'
  ) THEN
    ALTER TABLE invoices ADD COLUMN fodec_rate numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'fodec_amount'
  ) THEN
    ALTER TABLE invoices ADD COLUMN fodec_amount numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'timbre_amount'
  ) THEN
    ALTER TABLE invoices ADD COLUMN timbre_amount numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'public_token'
  ) THEN
    ALTER TABLE invoices ADD COLUMN public_token uuid DEFAULT gen_random_uuid() UNIQUE;
  END IF;
END $$;

-- 2. Add user_id to credit_notes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'credit_notes' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE credit_notes ADD COLUMN user_id uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- 3. Add user_id to return_orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'return_orders' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE return_orders ADD COLUMN user_id uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- 4. Add user_id to sales_orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales_orders' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE sales_orders ADD COLUMN user_id uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- 5. Add updated_at to delivery_notes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'delivery_notes' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE delivery_notes ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- 6. Add invoice_template to company_settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_settings' AND column_name = 'invoice_template'
  ) THEN
    ALTER TABLE company_settings ADD COLUMN invoice_template text DEFAULT 'pro';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_settings' AND column_name = 'default_timbre'
  ) THEN
    ALTER TABLE company_settings ADD COLUMN default_timbre numeric DEFAULT 1.000;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_settings' AND column_name = 'default_fodec_rate'
  ) THEN
    ALTER TABLE company_settings ADD COLUMN default_fodec_rate numeric DEFAULT 1;
  END IF;
END $$;

-- 7. Indexes
CREATE INDEX IF NOT EXISTS idx_credit_notes_user_id ON credit_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_return_orders_user_id ON return_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_user_id ON sales_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_public_token ON invoices(public_token);

-- 8. RLS policies for credit_notes (drop existing, recreate with user_id)
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view own credit notes" ON credit_notes;
  DROP POLICY IF EXISTS "Users can insert own credit notes" ON credit_notes;
  DROP POLICY IF EXISTS "Users can update own credit notes" ON credit_notes;
  DROP POLICY IF EXISTS "Users can delete own credit notes" ON credit_notes;
  DROP POLICY IF EXISTS "credit_notes_select" ON credit_notes;
  DROP POLICY IF EXISTS "credit_notes_insert" ON credit_notes;
  DROP POLICY IF EXISTS "credit_notes_update" ON credit_notes;
  DROP POLICY IF EXISTS "credit_notes_delete" ON credit_notes;
END $$;

CREATE POLICY "Users can view own credit notes"
  ON credit_notes FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own credit notes"
  ON credit_notes FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own credit notes"
  ON credit_notes FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own credit notes"
  ON credit_notes FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- 9. RLS policies for return_orders
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view own return orders" ON return_orders;
  DROP POLICY IF EXISTS "Users can insert own return orders" ON return_orders;
  DROP POLICY IF EXISTS "Users can update own return orders" ON return_orders;
  DROP POLICY IF EXISTS "Users can delete own return orders" ON return_orders;
  DROP POLICY IF EXISTS "return_orders_select" ON return_orders;
  DROP POLICY IF EXISTS "return_orders_insert" ON return_orders;
  DROP POLICY IF EXISTS "return_orders_update" ON return_orders;
  DROP POLICY IF EXISTS "return_orders_delete" ON return_orders;
END $$;

CREATE POLICY "Users can view own return orders"
  ON return_orders FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own return orders"
  ON return_orders FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own return orders"
  ON return_orders FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own return orders"
  ON return_orders FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- 10. RLS policies for sales_orders
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view own sales orders" ON sales_orders;
  DROP POLICY IF EXISTS "Users can insert own sales orders" ON sales_orders;
  DROP POLICY IF EXISTS "Users can update own sales orders" ON sales_orders;
  DROP POLICY IF EXISTS "Users can delete own sales orders" ON sales_orders;
  DROP POLICY IF EXISTS "sales_orders_select" ON sales_orders;
  DROP POLICY IF EXISTS "sales_orders_insert" ON sales_orders;
  DROP POLICY IF EXISTS "sales_orders_update" ON sales_orders;
  DROP POLICY IF EXISTS "sales_orders_delete" ON sales_orders;
END $$;

CREATE POLICY "Users can view own sales orders"
  ON sales_orders FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own sales orders"
  ON sales_orders FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own sales orders"
  ON sales_orders FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own sales orders"
  ON sales_orders FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));
