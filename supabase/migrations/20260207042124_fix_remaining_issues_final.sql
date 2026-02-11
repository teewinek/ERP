/*
  # Fix Remaining Security Issues - Final

  1. Add missing indexes on foreign keys
  2. Add proper RLS policies for tax_rules
  3. Fix overly permissive RLS policies for tables with user_id columns

  Note: Tables without user_id columns (attachments, bank_accounts, etc.) are designed
  for single-tenant use where all authenticated users in the workspace can access all data.
  This is appropriate for an ERP system where there's one company per database instance.
*/

-- ============================================================================
-- PART 1: ADD MISSING INDEXES ON FOREIGN KEYS
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_delivery_note_items_delivery_note_id ON delivery_note_items(delivery_note_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_client_id ON delivery_notes(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_id ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_quote_items_quote_id ON quote_items(quote_id);
CREATE INDEX IF NOT EXISTS idx_quotes_client_id ON quotes(client_id);

-- ============================================================================
-- PART 2: ADD RLS POLICIES FOR TAX_RULES
-- ============================================================================

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

-- ============================================================================
-- PART 3: FIX OVERLY PERMISSIVE POLICIES FOR TABLES WITH USER_ID
-- ============================================================================

-- Coupon Usages - Make user-specific
DROP POLICY IF EXISTS "auth_all_coupon_usages" ON coupon_usages;
CREATE POLICY "Users can manage own coupon usages"
  ON coupon_usages FOR ALL
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- Subscriptions - Make user-specific
DROP POLICY IF EXISTS "auth_insert_subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "auth_update_subscriptions" ON subscriptions;
CREATE POLICY "Users can manage own subscriptions"
  ON subscriptions FOR ALL
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- TEJ Exports - Make user-specific via exported_by
DROP POLICY IF EXISTS "auth_all_tej_exports" ON tej_exports;
CREATE POLICY "Users can manage own tej exports"
  ON tej_exports FOR ALL
  TO authenticated
  USING (exported_by = (select auth.uid()))
  WITH CHECK (exported_by = (select auth.uid()));
