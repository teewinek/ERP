/*
  # Optimize RLS Performance and Complete Security Scoping

  1. Performance Optimizations
    - Replace all `auth.uid()` calls with `(select auth.uid())` in RLS policies
    - This prevents re-evaluation of auth context for each row, significantly improving query performance at scale

  2. Security Enhancements
    - Add user_id columns to company-wide tables (tax_rules, treasury_transactions, bank_accounts)
    - Scope all policies properly to user ownership
    - Remove overly permissive "always true" policies

  3. Architecture
    - Multi-tenant ERP where each authenticated user represents a separate company
    - All data must be scoped to the owning user through direct user_id or relationship chains
*/

-- ============================================================================
-- PART 1: ADD MISSING USER_ID COLUMNS FOR PROPER SCOPING
-- ============================================================================

-- Add user_id to tax_rules
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tax_rules' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE tax_rules ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_tax_rules_user_id ON tax_rules(user_id);
  END IF;
END $$;

-- Add user_id to treasury_transactions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'treasury_transactions' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE treasury_transactions ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_treasury_transactions_user_id ON treasury_transactions(user_id);
  END IF;
END $$;

-- Add user_id to bank_accounts (for company bank accounts, supplier-linked accounts use supplier.user_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bank_accounts' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE bank_accounts ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_bank_accounts_user_id ON bank_accounts(user_id);
  END IF;
END $$;

-- ============================================================================
-- PART 2: OPTIMIZE SALES ORDERS POLICIES (FIX auth.uid() PERFORMANCE)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own sales orders" ON sales_orders;
DROP POLICY IF EXISTS "Users can insert own sales orders" ON sales_orders;
DROP POLICY IF EXISTS "Users can update own sales orders" ON sales_orders;
DROP POLICY IF EXISTS "Users can delete own sales orders" ON sales_orders;

CREATE POLICY "Users can view own sales orders"
  ON sales_orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = sales_orders.client_id
      AND clients.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can insert own sales orders"
  ON sales_orders FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = sales_orders.client_id
      AND clients.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can update own sales orders"
  ON sales_orders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = sales_orders.client_id
      AND clients.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = sales_orders.client_id
      AND clients.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can delete own sales orders"
  ON sales_orders FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = sales_orders.client_id
      AND clients.user_id = (select auth.uid())
    )
  );

-- ============================================================================
-- PART 3: OPTIMIZE SALES ORDER ITEMS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can manage own sales order items" ON sales_order_items;

CREATE POLICY "Users can manage own sales order items"
  ON sales_order_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sales_orders
      JOIN clients ON clients.id = sales_orders.client_id
      WHERE sales_orders.id = sales_order_items.sales_order_id
      AND clients.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sales_orders
      JOIN clients ON clients.id = sales_orders.client_id
      WHERE sales_orders.id = sales_order_items.sales_order_id
      AND clients.user_id = (select auth.uid())
    )
  );

-- ============================================================================
-- PART 4: OPTIMIZE CREDIT NOTES POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own credit notes" ON credit_notes;
DROP POLICY IF EXISTS "Users can insert own credit notes" ON credit_notes;
DROP POLICY IF EXISTS "Users can update own credit notes" ON credit_notes;
DROP POLICY IF EXISTS "Users can delete own credit notes" ON credit_notes;

CREATE POLICY "Users can view own credit notes"
  ON credit_notes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = credit_notes.client_id
      AND clients.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can insert own credit notes"
  ON credit_notes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = credit_notes.client_id
      AND clients.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can update own credit notes"
  ON credit_notes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = credit_notes.client_id
      AND clients.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = credit_notes.client_id
      AND clients.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can delete own credit notes"
  ON credit_notes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = credit_notes.client_id
      AND clients.user_id = (select auth.uid())
    )
  );

-- ============================================================================
-- PART 5: OPTIMIZE CREDIT NOTE ITEMS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can manage own credit note items" ON credit_note_items;

CREATE POLICY "Users can manage own credit note items"
  ON credit_note_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM credit_notes
      JOIN clients ON clients.id = credit_notes.client_id
      WHERE credit_notes.id = credit_note_items.credit_note_id
      AND clients.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM credit_notes
      JOIN clients ON clients.id = credit_notes.client_id
      WHERE credit_notes.id = credit_note_items.credit_note_id
      AND clients.user_id = (select auth.uid())
    )
  );

-- ============================================================================
-- PART 6: OPTIMIZE RETURN ORDERS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own return orders" ON return_orders;
DROP POLICY IF EXISTS "Users can insert own return orders" ON return_orders;
DROP POLICY IF EXISTS "Users can update own return orders" ON return_orders;
DROP POLICY IF EXISTS "Users can delete own return orders" ON return_orders;

CREATE POLICY "Users can view own return orders"
  ON return_orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = return_orders.client_id
      AND clients.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can insert own return orders"
  ON return_orders FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = return_orders.client_id
      AND clients.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can update own return orders"
  ON return_orders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = return_orders.client_id
      AND clients.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = return_orders.client_id
      AND clients.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can delete own return orders"
  ON return_orders FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = return_orders.client_id
      AND clients.user_id = (select auth.uid())
    )
  );

-- ============================================================================
-- PART 7: OPTIMIZE RETURN ORDER ITEMS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can manage own return order items" ON return_order_items;

CREATE POLICY "Users can manage own return order items"
  ON return_order_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM return_orders
      JOIN clients ON clients.id = return_orders.client_id
      WHERE return_orders.id = return_order_items.return_order_id
      AND clients.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM return_orders
      JOIN clients ON clients.id = return_orders.client_id
      WHERE return_orders.id = return_order_items.return_order_id
      AND clients.user_id = (select auth.uid())
    )
  );

-- ============================================================================
-- PART 8: OPTIMIZE ATTACHMENTS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can manage attachments for owned entities" ON attachments;

CREATE POLICY "Users can manage attachments for owned entities"
  ON attachments FOR ALL
  TO authenticated
  USING (
    CASE entity_type
      WHEN 'invoice' THEN EXISTS (
        SELECT 1 FROM invoices WHERE invoices.id = attachments.entity_id AND invoices.user_id = (select auth.uid())
      )
      WHEN 'quote' THEN EXISTS (
        SELECT 1 FROM quotes WHERE quotes.id = attachments.entity_id AND quotes.user_id = (select auth.uid())
      )
      WHEN 'client' THEN EXISTS (
        SELECT 1 FROM clients WHERE clients.id = attachments.entity_id AND clients.user_id = (select auth.uid())
      )
      WHEN 'supplier' THEN EXISTS (
        SELECT 1 FROM suppliers WHERE suppliers.id = attachments.entity_id AND suppliers.user_id = (select auth.uid())
      )
      WHEN 'sales_order' THEN EXISTS (
        SELECT 1 FROM sales_orders 
        JOIN clients ON clients.id = sales_orders.client_id
        WHERE sales_orders.id = attachments.entity_id AND clients.user_id = (select auth.uid())
      )
      WHEN 'credit_note' THEN EXISTS (
        SELECT 1 FROM credit_notes
        JOIN clients ON clients.id = credit_notes.client_id
        WHERE credit_notes.id = attachments.entity_id AND clients.user_id = (select auth.uid())
      )
      WHEN 'return_order' THEN EXISTS (
        SELECT 1 FROM return_orders
        JOIN clients ON clients.id = return_orders.client_id
        WHERE return_orders.id = attachments.entity_id AND clients.user_id = (select auth.uid())
      )
      ELSE false
    END
  )
  WITH CHECK (
    CASE entity_type
      WHEN 'invoice' THEN EXISTS (
        SELECT 1 FROM invoices WHERE invoices.id = attachments.entity_id AND invoices.user_id = (select auth.uid())
      )
      WHEN 'quote' THEN EXISTS (
        SELECT 1 FROM quotes WHERE quotes.id = attachments.entity_id AND quotes.user_id = (select auth.uid())
      )
      WHEN 'client' THEN EXISTS (
        SELECT 1 FROM clients WHERE clients.id = attachments.entity_id AND clients.user_id = (select auth.uid())
      )
      WHEN 'supplier' THEN EXISTS (
        SELECT 1 FROM suppliers WHERE suppliers.id = attachments.entity_id AND suppliers.user_id = (select auth.uid())
      )
      WHEN 'sales_order' THEN EXISTS (
        SELECT 1 FROM sales_orders 
        JOIN clients ON clients.id = sales_orders.client_id
        WHERE sales_orders.id = attachments.entity_id AND clients.user_id = (select auth.uid())
      )
      WHEN 'credit_note' THEN EXISTS (
        SELECT 1 FROM credit_notes
        JOIN clients ON clients.id = credit_notes.client_id
        WHERE credit_notes.id = attachments.entity_id AND clients.user_id = (select auth.uid())
      )
      WHEN 'return_order' THEN EXISTS (
        SELECT 1 FROM return_orders
        JOIN clients ON clients.id = return_orders.client_id
        WHERE return_orders.id = attachments.entity_id AND clients.user_id = (select auth.uid())
      )
      ELSE false
    END
  );

-- ============================================================================
-- PART 9: FIX TAX RULES POLICIES - SCOPE TO USER
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can view tax rules" ON tax_rules;
DROP POLICY IF EXISTS "Authenticated users can insert tax rules" ON tax_rules;
DROP POLICY IF EXISTS "Authenticated users can update tax rules" ON tax_rules;
DROP POLICY IF EXISTS "Authenticated users can delete tax rules" ON tax_rules;

CREATE POLICY "Users can view own tax rules"
  ON tax_rules FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own tax rules"
  ON tax_rules FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own tax rules"
  ON tax_rules FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own tax rules"
  ON tax_rules FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- ============================================================================
-- PART 10: FIX TREASURY TRANSACTIONS POLICIES - SCOPE TO USER
-- ============================================================================

DROP POLICY IF EXISTS "auth_all_treasury" ON treasury_transactions;

CREATE POLICY "Users can view own treasury transactions"
  ON treasury_transactions FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own treasury transactions"
  ON treasury_transactions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own treasury transactions"
  ON treasury_transactions FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own treasury transactions"
  ON treasury_transactions FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- ============================================================================
-- PART 11: FIX BANK ACCOUNTS POLICIES - SCOPE TO USER AND SUPPLIER
-- ============================================================================

DROP POLICY IF EXISTS "auth_all_bank_accounts" ON bank_accounts;

-- Bank accounts can be owned directly (user_id) or through suppliers (supplier_id -> suppliers.user_id)
CREATE POLICY "Users can view own bank accounts"
  ON bank_accounts FOR SELECT
  TO authenticated
  USING (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM suppliers
      WHERE suppliers.id = bank_accounts.supplier_id
      AND suppliers.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can insert own bank accounts"
  ON bank_accounts FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM suppliers
      WHERE suppliers.id = bank_accounts.supplier_id
      AND suppliers.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can update own bank accounts"
  ON bank_accounts FOR UPDATE
  TO authenticated
  USING (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM suppliers
      WHERE suppliers.id = bank_accounts.supplier_id
      AND suppliers.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM suppliers
      WHERE suppliers.id = bank_accounts.supplier_id
      AND suppliers.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can delete own bank accounts"
  ON bank_accounts FOR DELETE
  TO authenticated
  USING (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM suppliers
      WHERE suppliers.id = bank_accounts.supplier_id
      AND suppliers.user_id = (select auth.uid())
    )
  );
