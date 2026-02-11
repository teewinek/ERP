/*
  # Commercial Modules - Step 1: Create Tables
  
  Creates all new tables without complex policies first.
*/

-- 1. SALES ORDERS
CREATE TABLE IF NOT EXISTS sales_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  so_number text UNIQUE NOT NULL,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'in_production', 'delivered', 'invoiced')),
  amount_ht numeric NOT NULL DEFAULT 0,
  amount_tva numeric NOT NULL DEFAULT 0,
  amount_ttc numeric NOT NULL DEFAULT 0,
  delivery_date date,
  linked_bl_id uuid,
  linked_invoice_id uuid,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sales_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_id uuid REFERENCES sales_orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  tva_rate numeric NOT NULL DEFAULT 19,
  total_ht numeric NOT NULL DEFAULT 0,
  total_tva numeric NOT NULL DEFAULT 0,
  total_ttc numeric NOT NULL DEFAULT 0,
  notes text
);

-- 2. RETURN ORDERS
CREATE TABLE IF NOT EXISTS return_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rn_number text UNIQUE NOT NULL,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL,
  sales_order_id uuid REFERENCES sales_orders(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'validated', 'processed', 'closed')),
  return_reason text,
  return_to_stock boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS return_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  return_order_id uuid REFERENCES return_orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  tva_rate numeric NOT NULL DEFAULT 19,
  total_ht numeric NOT NULL DEFAULT 0,
  total_tva numeric NOT NULL DEFAULT 0,
  total_ttc numeric NOT NULL DEFAULT 0,
  notes text
);

-- 3. CREDIT NOTES
CREATE TABLE IF NOT EXISTS credit_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cn_number text UNIQUE NOT NULL,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL,
  return_order_id uuid REFERENCES return_orders(id) ON DELETE SET NULL,
  type text NOT NULL DEFAULT 'partial' CHECK (type IN ('total', 'partial')),
  amount_ht numeric NOT NULL DEFAULT 0,
  amount_tva numeric NOT NULL DEFAULT 0,
  amount_ttc numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'validated', 'applied')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS credit_note_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_note_id uuid REFERENCES credit_notes(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  tva_rate numeric NOT NULL DEFAULT 19,
  total_ht numeric NOT NULL DEFAULT 0,
  total_tva numeric NOT NULL DEFAULT 0,
  total_ttc numeric NOT NULL DEFAULT 0,
  notes text
);

-- 4. ATTACHMENTS
CREATE TABLE IF NOT EXISTS attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text NOT NULL,
  file_size bigint NOT NULL,
  document_type text,
  tags text[] DEFAULT '{}',
  uploaded_at timestamptz DEFAULT now()
);

-- 5. BANK ACCOUNTS
CREATE TABLE IF NOT EXISTS bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid REFERENCES suppliers(id) ON DELETE CASCADE,
  bank_name text NOT NULL,
  rib_iban text NOT NULL,
  account_holder text NOT NULL,
  notes text,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 6. TREASURY
CREATE TABLE IF NOT EXISTS treasury_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_date date NOT NULL DEFAULT CURRENT_DATE,
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  category text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL,
  account_name text NOT NULL DEFAULT 'Caisse',
  description text,
  tags text[] DEFAULT '{}',
  reference_type text,
  reference_id uuid,
  created_at timestamptz DEFAULT now()
);

-- 7. SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  plan text NOT NULL,
  status text NOT NULL DEFAULT 'trial',
  start_date timestamptz DEFAULT now(),
  end_date timestamptz,
  auto_renew boolean DEFAULT true,
  coupon_code text,
  created_at timestamptz DEFAULT now()
);

-- 8. PAYMENTS
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid REFERENCES subscriptions(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'TND',
  payment_method text,
  status text NOT NULL DEFAULT 'pending',
  transaction_id text,
  paid_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 9. COUPONS
CREATE TABLE IF NOT EXISTS coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  discount_type text NOT NULL,
  discount_value numeric NOT NULL DEFAULT 0,
  max_uses integer DEFAULT 1,
  used_count integer DEFAULT 0,
  valid_from timestamptz DEFAULT now(),
  valid_until timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS coupon_usages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid REFERENCES coupons(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES subscriptions(id) ON DELETE SET NULL,
  used_at timestamptz DEFAULT now(),
  UNIQUE(coupon_id, user_id)
);

-- 10. TEJ EXPORTS
CREATE TABLE IF NOT EXISTS tej_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  export_date timestamptz DEFAULT now(),
  month integer NOT NULL,
  year integer NOT NULL,
  total_retenue numeric NOT NULL DEFAULT 0,
  line_count integer NOT NULL DEFAULT 0,
  file_url text,
  exported_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- 11. TAX RULES
CREATE TABLE IF NOT EXISTS tax_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  rate numeric NOT NULL DEFAULT 0,
  type text NOT NULL,
  is_active boolean DEFAULT true,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ENABLE RLS
ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_note_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE treasury_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_usages ENABLE ROW LEVEL SECURITY;
ALTER TABLE tej_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_rules ENABLE ROW LEVEL SECURITY;

-- SIMPLE RLS POLICIES
CREATE POLICY "auth_all_sales_orders" ON sales_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_sales_order_items" ON sales_order_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_return_orders" ON return_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_return_order_items" ON return_order_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_credit_notes" ON credit_notes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_credit_note_items" ON credit_note_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_attachments" ON attachments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_bank_accounts" ON bank_accounts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_treasury" ON treasury_transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_select_subscriptions" ON subscriptions FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_subscriptions" ON subscriptions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_subscriptions" ON subscriptions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_select_payments" ON payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_payments" ON payments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_select_coupons" ON coupons FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_all_coupon_usages" ON coupon_usages FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_tej_exports" ON tej_exports FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_tax_rules" ON tax_rules FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- INSERT DEFAULT DATA
INSERT INTO coupons (code, discount_type, discount_value, max_uses, is_active)
VALUES ('Hayder2040', 'free_years', 10, 999999, true)
ON CONFLICT (code) DO NOTHING;

INSERT INTO tax_rules (name, rate, type, is_active, is_default)
VALUES 
  ('TVA 19%', 19, 'tva', true, true),
  ('TVA 17%', 17, 'tva', true, false),
  ('TVA 1%', 1, 'tva', true, false),
  ('FODEC 1%', 1, 'fodec', true, true)
ON CONFLICT DO NOTHING;
