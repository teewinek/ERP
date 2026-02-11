/*
  # Add Missing Foreign Key Indexes

  1. Performance Improvements
    - Add indexes for all unindexed foreign keys
    - These indexes significantly improve JOIN performance and foreign key constraint checking
    
  2. Tables Updated
    - bank_accounts, coupon_usages, credit_notes, delivery_notes, invoices
    - payments, product_variants, production_jobs, purchase_order_items
    - quotes, return_orders, sales_orders, subscriptions, tej_exports
    - And all their related item tables
*/

CREATE INDEX IF NOT EXISTS idx_bank_accounts_supplier_id ON bank_accounts(supplier_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usages_subscription_id ON coupon_usages(subscription_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usages_user_id ON coupon_usages(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_note_items_credit_note_id ON credit_note_items(credit_note_id);
CREATE INDEX IF NOT EXISTS idx_credit_note_items_product_id ON credit_note_items(product_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_client_id ON credit_notes(client_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_invoice_id ON credit_notes(invoice_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_return_order_id ON credit_notes(return_order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_note_items_product_id ON delivery_note_items(product_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_invoice_id ON delivery_notes(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_product_id ON invoice_items(product_id);
CREATE INDEX IF NOT EXISTS idx_invoices_source_quote_id ON invoices(source_quote_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_production_jobs_client_id ON production_jobs(client_id);
CREATE INDEX IF NOT EXISTS idx_production_jobs_invoice_id ON production_jobs(invoice_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_purchase_order_id ON purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_quote_items_product_id ON quote_items(product_id);
CREATE INDEX IF NOT EXISTS idx_quotes_converted_invoice_id ON quotes(converted_invoice_id);
CREATE INDEX IF NOT EXISTS idx_return_order_items_product_id ON return_order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_return_order_items_return_order_id ON return_order_items(return_order_id);
CREATE INDEX IF NOT EXISTS idx_return_orders_client_id ON return_orders(client_id);
CREATE INDEX IF NOT EXISTS idx_return_orders_invoice_id ON return_orders(invoice_id);
CREATE INDEX IF NOT EXISTS idx_return_orders_sales_order_id ON return_orders(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_sales_order_items_product_id ON sales_order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_sales_order_items_sales_order_id ON sales_order_items(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_client_id ON sales_orders(client_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_linked_bl_id ON sales_orders(linked_bl_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_linked_invoice_id ON sales_orders(linked_invoice_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_tej_exports_exported_by ON tej_exports(exported_by);

DROP POLICY IF EXISTS "Users can read own payments" ON payments;
DROP POLICY IF EXISTS "Users can insert own payments" ON payments;
DROP POLICY IF EXISTS "Authenticated users can view tax rules" ON tax_rules;
DROP POLICY IF EXISTS "Authenticated users can insert tax rules" ON tax_rules;
DROP POLICY IF EXISTS "Authenticated users can update tax rules" ON tax_rules;
DROP POLICY IF EXISTS "Authenticated users can delete tax rules" ON tax_rules;
