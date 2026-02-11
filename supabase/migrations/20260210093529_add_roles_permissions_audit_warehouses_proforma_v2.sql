/*
  # ERP Professional Foundation - Roles, Permissions, Audit & Multi-Warehouse

  ## 1. New Tables Created

  ### Roles & Permissions
    - `roles`: System roles (Admin, Ventes, Stock, Finance, Comptable, Production)
    - `user_roles`: Assigns roles to users with optional warehouse restriction
    - `activity_logs`: Complete audit trail with IP, device, session tracking
  
  ### Multi-Warehouse/Agency Management
    - `warehouses`: Physical locations (agences, entrepôts, magasins)
  
  ### Document Numbering Enhancement
    - `numbering_sequences`: Advanced numbering with annual reset
  
  ### Proforma Invoices
    - `proformas`: Proforma invoices (factures proforma)
    - `proforma_items`: Line items for proformas

  ## 2. Modified Tables
    - Add `warehouse_id` to: invoices, quotes, sales_orders, delivery_notes, purchase_orders
    - Add `converted_proforma_id` to invoices table
    - Update company_settings with proforma numbering

  ## 3. Security (RLS)
    - All new tables have RLS enabled
    - Role-based access policies
    - Warehouse-scoped policies where applicable
    - Activity logs are read-only for non-admins

  ## 4. Functions
    - `get_next_document_number()`: Generate next document number with auto-reset
*/

-- ==================== ROLES ====================

CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  display_name text NOT NULL,
  description text,
  is_system boolean DEFAULT true,
  permissions jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

-- ==================== USER ROLES ====================

CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role_id uuid REFERENCES roles(id) ON DELETE CASCADE NOT NULL,
  warehouse_id uuid,
  assigned_by uuid REFERENCES auth.users(id),
  assigned_at timestamptz DEFAULT now(),
  UNIQUE(user_id, role_id, warehouse_id)
);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_warehouse_id ON user_roles(warehouse_id);

-- ==================== ACTIVITY LOGS ====================

CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address inet,
  user_agent text,
  device_type text,
  session_id text,
  success boolean DEFAULT true,
  error_message text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);

-- ==================== WAREHOUSES ====================

CREATE TABLE IF NOT EXISTS warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  type text DEFAULT 'warehouse',
  address text,
  city text,
  postal_code text,
  phone text,
  manager_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active boolean DEFAULT true,
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_warehouses_code ON warehouses(code);
CREATE INDEX IF NOT EXISTS idx_warehouses_manager ON warehouses(manager_id);
CREATE INDEX IF NOT EXISTS idx_warehouses_type ON warehouses(type);

-- ==================== NUMBERING SEQUENCES ====================

CREATE TABLE IF NOT EXISTS numbering_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  warehouse_id uuid REFERENCES warehouses(id) ON DELETE SET NULL,
  document_type text NOT NULL,
  prefix text NOT NULL,
  format_pattern text DEFAULT '{PREFIX}-{YEAR}-{SEQ:5}',
  current_year integer DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  current_sequence integer DEFAULT 0,
  reset_annually boolean DEFAULT true,
  start_number integer DEFAULT 1,
  padding integer DEFAULT 5,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, warehouse_id, document_type)
);

ALTER TABLE numbering_sequences ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_numbering_seq_user ON numbering_sequences(user_id);
CREATE INDEX IF NOT EXISTS idx_numbering_seq_type ON numbering_sequences(document_type);

-- ==================== PROFORMAS ====================

CREATE TABLE IF NOT EXISTS proformas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  warehouse_id uuid REFERENCES warehouses(id) ON DELETE SET NULL,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  proforma_number text UNIQUE NOT NULL,
  status text DEFAULT 'draft',
  issue_date date DEFAULT CURRENT_DATE,
  valid_until date,
  subtotal numeric DEFAULT 0,
  tva_amount numeric DEFAULT 0,
  fodec_rate numeric DEFAULT 0,
  fodec_amount numeric DEFAULT 0,
  timbre_amount numeric DEFAULT 0,
  discount_percent numeric DEFAULT 0,
  discount_amount numeric DEFAULT 0,
  total numeric DEFAULT 0,
  notes text,
  tags text[] DEFAULT '{}',
  converted_invoice_id uuid,
  payment_terms text,
  delivery_terms text,
  public_token uuid DEFAULT gen_random_uuid() UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE proformas ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_proformas_user_id ON proformas(user_id);
CREATE INDEX IF NOT EXISTS idx_proformas_client_id ON proformas(client_id);
CREATE INDEX IF NOT EXISTS idx_proformas_warehouse_id ON proformas(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_proformas_status ON proformas(status);
CREATE INDEX IF NOT EXISTS idx_proformas_public_token ON proformas(public_token);
CREATE INDEX IF NOT EXISTS idx_proformas_number ON proformas(proforma_number);

CREATE TABLE IF NOT EXISTS proforma_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proforma_id uuid REFERENCES proformas(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  description text NOT NULL,
  quantity numeric NOT NULL,
  unit_price numeric NOT NULL,
  tva_rate numeric DEFAULT 19,
  discount_percent numeric DEFAULT 0,
  total numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE proforma_items ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_proforma_items_proforma ON proforma_items(proforma_id);
CREATE INDEX IF NOT EXISTS idx_proforma_items_product ON proforma_items(product_id);

-- ==================== RLS POLICIES ====================

-- Roles policies
CREATE POLICY "Roles are viewable by authenticated users"
  ON roles FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage roles"
  ON roles FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = (SELECT auth.uid())
      AND r.name = 'admin'
    )
  );

-- User roles policies
CREATE POLICY "Users can view own roles"
  ON user_roles FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Admins can manage all user roles"
  ON user_roles FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = (SELECT auth.uid())
      AND r.name = 'admin'
    )
  );

-- Activity logs policies
CREATE POLICY "Admins can view all logs"
  ON activity_logs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = (SELECT auth.uid())
      AND r.name = 'admin'
    )
  );

CREATE POLICY "Users can view own activity"
  ON activity_logs FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Warehouses policies
CREATE POLICY "Warehouses viewable by authenticated users"
  ON warehouses FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins and stock managers can manage warehouses"
  ON warehouses FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = (SELECT auth.uid())
      AND r.name IN ('admin', 'stock')
    )
  );

-- Numbering sequences policies
CREATE POLICY "Users can view own numbering sequences"
  ON numbering_sequences FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can manage own numbering sequences"
  ON numbering_sequences FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Proformas policies
CREATE POLICY "Users can view own proformas"
  ON proformas FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own proformas"
  ON proformas FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own proformas"
  ON proformas FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own proformas"
  ON proformas FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Proforma items policies
CREATE POLICY "Users can view own proforma items"
  ON proforma_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM proformas
      WHERE proformas.id = proforma_items.proforma_id
      AND proformas.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can manage own proforma items"
  ON proforma_items FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM proformas
      WHERE proformas.id = proforma_items.proforma_id
      AND proformas.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM proformas
      WHERE proformas.id = proforma_items.proforma_id
      AND proformas.user_id = (SELECT auth.uid())
    )
  );

-- ==================== INSERT DEFAULT DATA ====================

-- Insert default system roles
INSERT INTO roles (name, display_name, description, is_system, permissions) VALUES
  ('admin', 'Administrateur', 'Accès complet au système', true, '["*"]'::jsonb),
  ('sales', 'Commercial', 'Gestion des ventes et clients', true, '["clients.read", "clients.write", "quotes.read", "quotes.write", "invoices.read", "invoices.write", "proformas.read", "proformas.write"]'::jsonb),
  ('stock', 'Gestionnaire Stock', 'Gestion des stocks et achats', true, '["products.read", "products.write", "purchases.read", "purchases.write", "warehouses.read", "delivery_notes.read", "delivery_notes.write"]'::jsonb),
  ('finance', 'Responsable Finance', 'Gestion financière et trésorerie', true, '["invoices.read", "payments.read", "payments.write", "treasury.read", "treasury.write", "reports.read"]'::jsonb),
  ('accountant', 'Comptable', 'Comptabilité et conformité', true, '["invoices.read", "purchases.read", "expenses.read", "reports.read", "tej_export.read", "tej_export.write"]'::jsonb),
  ('production', 'Production', 'Gestion de la production', true, '["production.read", "production.write", "sales_orders.read"]'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- ==================== FUNCTIONS ====================

-- Function to get next document number with auto-reset
CREATE OR REPLACE FUNCTION get_next_document_number(
  p_user_id uuid,
  p_document_type text,
  p_warehouse_id uuid DEFAULT NULL
) RETURNS text AS $$
DECLARE
  v_seq RECORD;
  v_current_year integer;
  v_next_number integer;
  v_formatted_seq text;
  v_result text;
BEGIN
  v_current_year := EXTRACT(YEAR FROM CURRENT_DATE);
  
  SELECT * INTO v_seq
  FROM numbering_sequences
  WHERE user_id = p_user_id
    AND document_type = p_document_type
    AND (warehouse_id = p_warehouse_id OR (warehouse_id IS NULL AND p_warehouse_id IS NULL))
    AND is_active = true;
  
  IF NOT FOUND THEN
    INSERT INTO numbering_sequences (
      user_id, warehouse_id, document_type, prefix, current_year, current_sequence
    ) VALUES (
      p_user_id, p_warehouse_id, p_document_type, UPPER(SUBSTRING(p_document_type, 1, 3)), v_current_year, 0
    )
    RETURNING * INTO v_seq;
  END IF;
  
  IF v_seq.reset_annually AND v_seq.current_year < v_current_year THEN
    UPDATE numbering_sequences
    SET current_year = v_current_year,
        current_sequence = v_seq.start_number,
        updated_at = now()
    WHERE id = v_seq.id;
    
    v_next_number := v_seq.start_number;
  ELSE
    v_next_number := v_seq.current_sequence + 1;
    
    UPDATE numbering_sequences
    SET current_sequence = v_next_number,
        updated_at = now()
    WHERE id = v_seq.id;
  END IF;
  
  v_formatted_seq := LPAD(v_next_number::text, v_seq.padding, '0');
  
  v_result := v_seq.format_pattern;
  v_result := REPLACE(v_result, '{PREFIX}', v_seq.prefix);
  v_result := REPLACE(v_result, '{YEAR}', v_current_year::text);
  v_result := REPLACE(v_result, '{SEQ:' || v_seq.padding || '}', v_formatted_seq);
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- ==================== MODIFY EXISTING TABLES ====================

-- Add warehouse_id to invoices
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'warehouse_id'
  ) THEN
    ALTER TABLE invoices ADD COLUMN warehouse_id uuid REFERENCES warehouses(id) ON DELETE SET NULL;
    CREATE INDEX idx_invoices_warehouse_id ON invoices(warehouse_id);
  END IF;
END $$;

-- Add converted_proforma_id to invoices
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'converted_proforma_id'
  ) THEN
    ALTER TABLE invoices ADD COLUMN converted_proforma_id uuid REFERENCES proformas(id) ON DELETE SET NULL;
    CREATE INDEX idx_invoices_proforma_id ON invoices(converted_proforma_id);
  END IF;
END $$;

-- Add warehouse_id to quotes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotes' AND column_name = 'warehouse_id'
  ) THEN
    ALTER TABLE quotes ADD COLUMN warehouse_id uuid REFERENCES warehouses(id) ON DELETE SET NULL;
    CREATE INDEX idx_quotes_warehouse_id ON quotes(warehouse_id);
  END IF;
END $$;

-- Add warehouse_id to sales_orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales_orders' AND column_name = 'warehouse_id'
  ) THEN
    ALTER TABLE sales_orders ADD COLUMN warehouse_id uuid REFERENCES warehouses(id) ON DELETE SET NULL;
    CREATE INDEX idx_sales_orders_warehouse_id ON sales_orders(warehouse_id);
  END IF;
END $$;

-- Add warehouse_id to delivery_notes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'delivery_notes' AND column_name = 'warehouse_id'
  ) THEN
    ALTER TABLE delivery_notes ADD COLUMN warehouse_id uuid REFERENCES warehouses(id) ON DELETE SET NULL;
    CREATE INDEX idx_delivery_notes_warehouse_id ON delivery_notes(warehouse_id);
  END IF;
END $$;

-- Add warehouse_id to purchase_orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchase_orders' AND column_name = 'warehouse_id'
  ) THEN
    ALTER TABLE purchase_orders ADD COLUMN warehouse_id uuid REFERENCES warehouses(id) ON DELETE SET NULL;
    CREATE INDEX idx_purchase_orders_warehouse_id ON purchase_orders(warehouse_id);
  END IF;
END $$;

-- Add proforma fields to company_settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_settings' AND column_name = 'proforma_prefix'
  ) THEN
    ALTER TABLE company_settings ADD COLUMN proforma_prefix text DEFAULT 'PRO';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_settings' AND column_name = 'next_proforma_seq'
  ) THEN
    ALTER TABLE company_settings ADD COLUMN next_proforma_seq integer DEFAULT 1;
  END IF;
END $$;