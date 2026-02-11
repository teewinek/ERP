/*
  # Optimize RLS Policies for Performance

  1. Performance Optimization
    - Replace auth.uid() with (select auth.uid()) in all RLS policies
    - This caches the user ID and prevents re-evaluation for each row
    - Significantly improves query performance at scale
    
  2. Tables Updated
    - user_profiles, clients, products, invoices, suppliers
    - purchase_orders, expenses, production_jobs, quotes
    - delivery_notes, company_settings, payments, audit_logs
    - And all related child tables (items, variants)
*/

DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
CREATE POLICY "Users can read own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can read own clients" ON clients;
CREATE POLICY "Users can read own clients"
  ON clients FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own clients" ON clients;
CREATE POLICY "Users can insert own clients"
  ON clients FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own clients" ON clients;
CREATE POLICY "Users can update own clients"
  ON clients FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own clients" ON clients;
CREATE POLICY "Users can delete own clients"
  ON clients FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can read own products" ON products;
CREATE POLICY "Users can read own products"
  ON products FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own products" ON products;
CREATE POLICY "Users can insert own products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own products" ON products;
CREATE POLICY "Users can update own products"
  ON products FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own products" ON products;
CREATE POLICY "Users can delete own products"
  ON products FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can read own product variants" ON product_variants;
CREATE POLICY "Users can read own product variants"
  ON product_variants FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM products WHERE products.id = product_variants.product_id AND products.user_id = (select auth.uid())
  ));

DROP POLICY IF EXISTS "Users can insert own product variants" ON product_variants;
CREATE POLICY "Users can insert own product variants"
  ON product_variants FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM products WHERE products.id = product_variants.product_id AND products.user_id = (select auth.uid())
  ));

DROP POLICY IF EXISTS "Users can update own product variants" ON product_variants;
CREATE POLICY "Users can update own product variants"
  ON product_variants FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM products WHERE products.id = product_variants.product_id AND products.user_id = (select auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM products WHERE products.id = product_variants.product_id AND products.user_id = (select auth.uid())
  ));

DROP POLICY IF EXISTS "Users can delete own product variants" ON product_variants;
CREATE POLICY "Users can delete own product variants"
  ON product_variants FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM products WHERE products.id = product_variants.product_id AND products.user_id = (select auth.uid())
  ));

DROP POLICY IF EXISTS "Users can read own invoices" ON invoices;
CREATE POLICY "Users can read own invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own invoices" ON invoices;
CREATE POLICY "Users can insert own invoices"
  ON invoices FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own invoices" ON invoices;
CREATE POLICY "Users can update own invoices"
  ON invoices FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own invoices" ON invoices;
CREATE POLICY "Users can delete own invoices"
  ON invoices FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can read own invoice items" ON invoice_items;
CREATE POLICY "Users can read own invoice items"
  ON invoice_items FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.user_id = (select auth.uid())
  ));

DROP POLICY IF EXISTS "Users can insert own invoice items" ON invoice_items;
CREATE POLICY "Users can insert own invoice items"
  ON invoice_items FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.user_id = (select auth.uid())
  ));

DROP POLICY IF EXISTS "Users can update own invoice items" ON invoice_items;
CREATE POLICY "Users can update own invoice items"
  ON invoice_items FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.user_id = (select auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.user_id = (select auth.uid())
  ));

DROP POLICY IF EXISTS "Users can delete own invoice items" ON invoice_items;
CREATE POLICY "Users can delete own invoice items"
  ON invoice_items FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.user_id = (select auth.uid())
  ));

DROP POLICY IF EXISTS "Users can update own payments" ON payments;
CREATE POLICY "Users can update own payments"
  ON payments FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own payments" ON payments;
CREATE POLICY "Users can delete own payments"
  ON payments FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can read own suppliers" ON suppliers;
CREATE POLICY "Users can read own suppliers"
  ON suppliers FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own suppliers" ON suppliers;
CREATE POLICY "Users can insert own suppliers"
  ON suppliers FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own suppliers" ON suppliers;
CREATE POLICY "Users can update own suppliers"
  ON suppliers FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own suppliers" ON suppliers;
CREATE POLICY "Users can delete own suppliers"
  ON suppliers FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can read own purchase orders" ON purchase_orders;
CREATE POLICY "Users can read own purchase orders"
  ON purchase_orders FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own purchase orders" ON purchase_orders;
CREATE POLICY "Users can insert own purchase orders"
  ON purchase_orders FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own purchase orders" ON purchase_orders;
CREATE POLICY "Users can update own purchase orders"
  ON purchase_orders FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own purchase orders" ON purchase_orders;
CREATE POLICY "Users can delete own purchase orders"
  ON purchase_orders FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can read own po items" ON purchase_order_items;
CREATE POLICY "Users can read own po items"
  ON purchase_order_items FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM purchase_orders WHERE purchase_orders.id = purchase_order_items.purchase_order_id AND purchase_orders.user_id = (select auth.uid())
  ));

DROP POLICY IF EXISTS "Users can insert own po items" ON purchase_order_items;
CREATE POLICY "Users can insert own po items"
  ON purchase_order_items FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM purchase_orders WHERE purchase_orders.id = purchase_order_items.purchase_order_id AND purchase_orders.user_id = (select auth.uid())
  ));

DROP POLICY IF EXISTS "Users can update own po items" ON purchase_order_items;
CREATE POLICY "Users can update own po items"
  ON purchase_order_items FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM purchase_orders WHERE purchase_orders.id = purchase_order_items.purchase_order_id AND purchase_orders.user_id = (select auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM purchase_orders WHERE purchase_orders.id = purchase_order_items.purchase_order_id AND purchase_orders.user_id = (select auth.uid())
  ));

DROP POLICY IF EXISTS "Users can delete own po items" ON purchase_order_items;
CREATE POLICY "Users can delete own po items"
  ON purchase_order_items FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM purchase_orders WHERE purchase_orders.id = purchase_order_items.purchase_order_id AND purchase_orders.user_id = (select auth.uid())
  ));

DROP POLICY IF EXISTS "Users can read own expenses" ON expenses;
CREATE POLICY "Users can read own expenses"
  ON expenses FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own expenses" ON expenses;
CREATE POLICY "Users can insert own expenses"
  ON expenses FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own expenses" ON expenses;
CREATE POLICY "Users can update own expenses"
  ON expenses FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own expenses" ON expenses;
CREATE POLICY "Users can delete own expenses"
  ON expenses FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can read own production jobs" ON production_jobs;
CREATE POLICY "Users can read own production jobs"
  ON production_jobs FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own production jobs" ON production_jobs;
CREATE POLICY "Users can insert own production jobs"
  ON production_jobs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own production jobs" ON production_jobs;
CREATE POLICY "Users can update own production jobs"
  ON production_jobs FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own production jobs" ON production_jobs;
CREATE POLICY "Users can delete own production jobs"
  ON production_jobs FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can read own audit logs" ON audit_logs;
CREATE POLICY "Users can read own audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own audit logs" ON audit_logs;
CREATE POLICY "Users can insert own audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can read own quotes" ON quotes;
CREATE POLICY "Users can read own quotes"
  ON quotes FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own quotes" ON quotes;
CREATE POLICY "Users can insert own quotes"
  ON quotes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own quotes" ON quotes;
CREATE POLICY "Users can update own quotes"
  ON quotes FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own quotes" ON quotes;
CREATE POLICY "Users can delete own quotes"
  ON quotes FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can read own quote items" ON quote_items;
CREATE POLICY "Users can read own quote items"
  ON quote_items FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM quotes WHERE quotes.id = quote_items.quote_id AND quotes.user_id = (select auth.uid())
  ));

DROP POLICY IF EXISTS "Users can insert own quote items" ON quote_items;
CREATE POLICY "Users can insert own quote items"
  ON quote_items FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM quotes WHERE quotes.id = quote_items.quote_id AND quotes.user_id = (select auth.uid())
  ));

DROP POLICY IF EXISTS "Users can update own quote items" ON quote_items;
CREATE POLICY "Users can update own quote items"
  ON quote_items FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM quotes WHERE quotes.id = quote_items.quote_id AND quotes.user_id = (select auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM quotes WHERE quotes.id = quote_items.quote_id AND quotes.user_id = (select auth.uid())
  ));

DROP POLICY IF EXISTS "Users can delete own quote items" ON quote_items;
CREATE POLICY "Users can delete own quote items"
  ON quote_items FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM quotes WHERE quotes.id = quote_items.quote_id AND quotes.user_id = (select auth.uid())
  ));

DROP POLICY IF EXISTS "Users can read own delivery notes" ON delivery_notes;
CREATE POLICY "Users can read own delivery notes"
  ON delivery_notes FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own delivery notes" ON delivery_notes;
CREATE POLICY "Users can insert own delivery notes"
  ON delivery_notes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own delivery notes" ON delivery_notes;
CREATE POLICY "Users can update own delivery notes"
  ON delivery_notes FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own delivery notes" ON delivery_notes;
CREATE POLICY "Users can delete own delivery notes"
  ON delivery_notes FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can read own dn items" ON delivery_note_items;
CREATE POLICY "Users can read own dn items"
  ON delivery_note_items FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM delivery_notes WHERE delivery_notes.id = delivery_note_items.delivery_note_id AND delivery_notes.user_id = (select auth.uid())
  ));

DROP POLICY IF EXISTS "Users can insert own dn items" ON delivery_note_items;
CREATE POLICY "Users can insert own dn items"
  ON delivery_note_items FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM delivery_notes WHERE delivery_notes.id = delivery_note_items.delivery_note_id AND delivery_notes.user_id = (select auth.uid())
  ));

DROP POLICY IF EXISTS "Users can update own dn items" ON delivery_note_items;
CREATE POLICY "Users can update own dn items"
  ON delivery_note_items FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM delivery_notes WHERE delivery_notes.id = delivery_note_items.delivery_note_id AND delivery_notes.user_id = (select auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM delivery_notes WHERE delivery_notes.id = delivery_note_items.delivery_note_id AND delivery_notes.user_id = (select auth.uid())
  ));

DROP POLICY IF EXISTS "Users can delete own dn items" ON delivery_note_items;
CREATE POLICY "Users can delete own dn items"
  ON delivery_note_items FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM delivery_notes WHERE delivery_notes.id = delivery_note_items.delivery_note_id AND delivery_notes.user_id = (select auth.uid())
  ));

DROP POLICY IF EXISTS "Users can read own company settings" ON company_settings;
CREATE POLICY "Users can read own company settings"
  ON company_settings FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own company settings" ON company_settings;
CREATE POLICY "Users can insert own company settings"
  ON company_settings FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own company settings" ON company_settings;
CREATE POLICY "Users can update own company settings"
  ON company_settings FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));
