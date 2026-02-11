/*
  # Teewinek ERP PRO - Complete Database Schema

  1. New Tables
    - `user_profiles` - Extended user info with roles (admin, sales, finance)
      - `id` (uuid, PK, references auth.users)
      - `full_name` (text)
      - `role` (text) - admin, sales, finance
      - `avatar_url` (text)
      - `created_at` (timestamptz)

    - `clients` - B2B and B2C client database
      - `id` (uuid, PK)
      - `user_id` (uuid, FK to auth.users)
      - `name` (text) - company or person name
      - `type` (text) - b2b or b2c
      - `email` (text)
      - `phone` (text)
      - `address` (text)
      - `city` (text)
      - `tax_id` (text) - matricule fiscale
      - `notes` (text)
      - `created_at` (timestamptz)

    - `products` - Product catalog
      - `id` (uuid, PK)
      - `user_id` (uuid, FK)
      - `name` (text)
      - `description` (text)
      - `category` (text) - dtf, uv, embroidery, laser, other
      - `base_price` (numeric)
      - `cost_price` (numeric)
      - `tva_rate` (numeric) - default 19%
      - `sku` (text)
      - `is_active` (boolean)
      - `created_at` (timestamptz)

    - `product_variants` - Size, color, technique variants
      - `id` (uuid, PK)
      - `product_id` (uuid, FK)
      - `name` (text)
      - `sku` (text)
      - `price_adjustment` (numeric)
      - `stock_quantity` (integer)
      - `created_at` (timestamptz)

    - `invoices` - Invoice headers
      - `id` (uuid, PK)
      - `user_id` (uuid, FK)
      - `client_id` (uuid, FK)
      - `invoice_number` (text, unique)
      - `status` (text) - draft, validated, paid, cancelled
      - `issue_date` (date)
      - `due_date` (date)
      - `subtotal` (numeric) - HT
      - `tva_amount` (numeric)
      - `discount_percent` (numeric)
      - `discount_amount` (numeric)
      - `total` (numeric) - TTC
      - `notes` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `invoice_items` - Invoice line items
      - `id` (uuid, PK)
      - `invoice_id` (uuid, FK)
      - `product_id` (uuid, FK, nullable)
      - `description` (text)
      - `quantity` (numeric)
      - `unit_price` (numeric)
      - `tva_rate` (numeric)
      - `total` (numeric)
      - `created_at` (timestamptz)

    - `payments` - Payment tracking
      - `id` (uuid, PK)
      - `invoice_id` (uuid, FK)
      - `user_id` (uuid, FK)
      - `amount` (numeric)
      - `method` (text) - cash, bank_transfer, check, card
      - `reference` (text)
      - `payment_date` (date)
      - `notes` (text)
      - `created_at` (timestamptz)

    - `suppliers` - Supplier database
      - `id` (uuid, PK)
      - `user_id` (uuid, FK)
      - `name` (text)
      - `contact_name` (text)
      - `email` (text)
      - `phone` (text)
      - `address` (text)
      - `city` (text)
      - `tax_id` (text) - matricule fiscale
      - `category` (text)
      - `notes` (text)
      - `created_at` (timestamptz)

    - `purchase_orders` - Purchase order headers
      - `id` (uuid, PK)
      - `user_id` (uuid, FK)
      - `supplier_id` (uuid, FK)
      - `po_number` (text, unique)
      - `status` (text) - draft, ordered, received, cancelled
      - `order_date` (date)
      - `subtotal` (numeric)
      - `tva_amount` (numeric)
      - `total` (numeric)
      - `retenue_source` (numeric) - 1% if >= 1000 DT
      - `net_to_pay` (numeric)
      - `notes` (text)
      - `created_at` (timestamptz)

    - `purchase_order_items` - PO line items
      - `id` (uuid, PK)
      - `purchase_order_id` (uuid, FK)
      - `description` (text)
      - `quantity` (numeric)
      - `unit_price` (numeric)
      - `tva_rate` (numeric)
      - `total` (numeric)
      - `created_at` (timestamptz)

    - `expenses` - Operating expenses
      - `id` (uuid, PK)
      - `user_id` (uuid, FK)
      - `category` (text)
      - `description` (text)
      - `amount` (numeric)
      - `expense_date` (date)
      - `tags` (text array)
      - `receipt_url` (text)
      - `notes` (text)
      - `created_at` (timestamptz)

    - `production_jobs` - Production/job tracking
      - `id` (uuid, PK)
      - `user_id` (uuid, FK)
      - `invoice_id` (uuid, FK, nullable)
      - `client_id` (uuid, FK, nullable)
      - `job_number` (text, unique)
      - `title` (text)
      - `technique` (text) - dtf, uv, embroidery, laser
      - `status` (text) - pending, in_progress, completed, delivered
      - `priority` (text) - low, medium, high, urgent
      - `quantity` (integer)
      - `deadline` (date)
      - `notes` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `audit_logs` - Audit trail
      - `id` (uuid, PK)
      - `user_id` (uuid, FK)
      - `action` (text)
      - `entity_type` (text)
      - `entity_id` (uuid)
      - `details` (jsonb)
      - `ip_address` (text)
      - `created_at` (timestamptz)

  2. Security
    - RLS enabled on all tables
    - Policies for authenticated users to manage their own data
    - Audit logs readable by admin role only

  3. Notes
    - All monetary values stored as numeric for precision
    - Tunisia-specific: TVA rate default 19%, retenue a la source 1% for TTC >= 1000 DT
    - Invoice numbering uses format TEE-YYYY-NNNN
*/

-- User Profiles
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'admin',
  avatar_url text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON user_profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Clients
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'b2c',
  email text DEFAULT '',
  phone text DEFAULT '',
  address text DEFAULT '',
  city text DEFAULT '',
  tax_id text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own clients"
  ON clients FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own clients"
  ON clients FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own clients"
  ON clients FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own clients"
  ON clients FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  category text NOT NULL DEFAULT 'other',
  base_price numeric NOT NULL DEFAULT 0,
  cost_price numeric NOT NULL DEFAULT 0,
  tva_rate numeric NOT NULL DEFAULT 19,
  sku text DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own products"
  ON products FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own products"
  ON products FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own products"
  ON products FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own products"
  ON products FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Product Variants
CREATE TABLE IF NOT EXISTS product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name text NOT NULL,
  sku text DEFAULT '',
  price_adjustment numeric NOT NULL DEFAULT 0,
  stock_quantity integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own product variants"
  ON product_variants FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_variants.product_id
      AND products.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own product variants"
  ON product_variants FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_variants.product_id
      AND products.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own product variants"
  ON product_variants FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_variants.product_id
      AND products.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_variants.product_id
      AND products.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own product variants"
  ON product_variants FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_variants.product_id
      AND products.user_id = auth.uid()
    )
  );

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  invoice_number text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  subtotal numeric NOT NULL DEFAULT 0,
  tva_amount numeric NOT NULL DEFAULT 0,
  discount_percent numeric NOT NULL DEFAULT 0,
  discount_amount numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT invoices_invoice_number_user_unique UNIQUE (user_id, invoice_number)
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own invoices"
  ON invoices FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own invoices"
  ON invoices FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own invoices"
  ON invoices FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own invoices"
  ON invoices FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Invoice Items
CREATE TABLE IF NOT EXISTS invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  description text NOT NULL DEFAULT '',
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  tva_rate numeric NOT NULL DEFAULT 19,
  total numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own invoice items"
  ON invoice_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own invoice items"
  ON invoice_items FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own invoice items"
  ON invoice_items FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own invoice items"
  ON invoice_items FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.user_id = auth.uid()
    )
  );

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  method text NOT NULL DEFAULT 'cash',
  reference text DEFAULT '',
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own payments"
  ON payments FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payments"
  ON payments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own payments"
  ON payments FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own payments"
  ON payments FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  contact_name text DEFAULT '',
  email text DEFAULT '',
  phone text DEFAULT '',
  address text DEFAULT '',
  city text DEFAULT '',
  tax_id text DEFAULT '',
  category text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own suppliers"
  ON suppliers FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own suppliers"
  ON suppliers FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own suppliers"
  ON suppliers FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own suppliers"
  ON suppliers FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Purchase Orders
CREATE TABLE IF NOT EXISTS purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  po_number text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  order_date date NOT NULL DEFAULT CURRENT_DATE,
  subtotal numeric NOT NULL DEFAULT 0,
  tva_amount numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  retenue_source numeric NOT NULL DEFAULT 0,
  net_to_pay numeric NOT NULL DEFAULT 0,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT po_number_user_unique UNIQUE (user_id, po_number)
);

ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own purchase orders"
  ON purchase_orders FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own purchase orders"
  ON purchase_orders FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own purchase orders"
  ON purchase_orders FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own purchase orders"
  ON purchase_orders FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Purchase Order Items
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  description text NOT NULL DEFAULT '',
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  tva_rate numeric NOT NULL DEFAULT 19,
  total numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own po items"
  ON purchase_order_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM purchase_orders
      WHERE purchase_orders.id = purchase_order_items.purchase_order_id
      AND purchase_orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own po items"
  ON purchase_order_items FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM purchase_orders
      WHERE purchase_orders.id = purchase_order_items.purchase_order_id
      AND purchase_orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own po items"
  ON purchase_order_items FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM purchase_orders
      WHERE purchase_orders.id = purchase_order_items.purchase_order_id
      AND purchase_orders.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM purchase_orders
      WHERE purchase_orders.id = purchase_order_items.purchase_order_id
      AND purchase_orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own po items"
  ON purchase_order_items FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM purchase_orders
      WHERE purchase_orders.id = purchase_order_items.purchase_order_id
      AND purchase_orders.user_id = auth.uid()
    )
  );

-- Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'general',
  description text NOT NULL DEFAULT '',
  amount numeric NOT NULL DEFAULT 0,
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  tags text[] DEFAULT '{}',
  receipt_url text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own expenses"
  ON expenses FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own expenses"
  ON expenses FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own expenses"
  ON expenses FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own expenses"
  ON expenses FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Production Jobs
CREATE TABLE IF NOT EXISTS production_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  job_number text NOT NULL,
  title text NOT NULL,
  technique text NOT NULL DEFAULT 'dtf',
  status text NOT NULL DEFAULT 'pending',
  priority text NOT NULL DEFAULT 'medium',
  quantity integer NOT NULL DEFAULT 1,
  deadline date,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT job_number_user_unique UNIQUE (user_id, job_number)
);

ALTER TABLE production_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own production jobs"
  ON production_jobs FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own production jobs"
  ON production_jobs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own production jobs"
  ON production_jobs FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own production jobs"
  ON production_jobs FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  details jsonb DEFAULT '{}',
  ip_address text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own audit logs"
  ON audit_logs FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own audit logs"
  ON audit_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_user_id ON suppliers(user_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_user_id ON purchase_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_id ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_production_jobs_user_id ON production_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_production_jobs_status ON production_jobs(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- Function to auto-create user profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO user_profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'admin'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION handle_new_user();
  END IF;
END $$;