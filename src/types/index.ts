export interface UserProfile {
  id: string;
  full_name: string;
  role: 'admin' | 'sales' | 'finance' | 'stock' | 'accountant' | 'production';
  avatar_url: string;
  company_name?: string;
  phone?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  created_at: string;
}

export interface Role {
  id: string;
  name: string;
  display_name: string;
  description: string;
  is_system: boolean;
  permissions: string[];
  created_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role_id: string;
  warehouse_id: string | null;
  assigned_by: string | null;
  assigned_at: string;
  roles?: Role;
  warehouses?: Warehouse;
}

export interface ActivityLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  device_type: string | null;
  session_id: string | null;
  success: boolean;
  error_message: string | null;
  created_at: string;
}

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  type: 'warehouse' | 'store' | 'agency' | 'production';
  address: string | null;
  city: string | null;
  postal_code: string | null;
  phone: string | null;
  manager_id: string | null;
  is_active: boolean;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface NumberingSequence {
  id: string;
  user_id: string;
  warehouse_id: string | null;
  document_type: string;
  prefix: string;
  format_pattern: string;
  current_year: number;
  current_sequence: number;
  reset_annually: boolean;
  start_number: number;
  padding: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  user_id: string;
  name: string;
  type: 'b2b' | 'b2c';
  email: string;
  phone: string;
  address: string;
  city: string;
  tax_id: string;
  notes: string;
  created_at: string;
}

export interface Product {
  id: string;
  user_id: string;
  name: string;
  description: string;
  category: 'dtf' | 'uv' | 'embroidery' | 'laser' | 'other';
  base_price: number;
  cost_price: number;
  tva_rate: number;
  sku: string;
  is_active: boolean;
  photo_url?: string;
  destination?: 'sale' | 'purchase' | 'both';
  product_type?: 'product' | 'service';
  purchase_price?: number;
  margin_percent?: number;
  created_at: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  sku: string;
  price_adjustment: number;
  stock_quantity: number;
  created_at: string;
}

export interface Invoice {
  id: string;
  user_id: string;
  warehouse_id: string | null;
  client_id: string | null;
  invoice_number: string;
  status: 'draft' | 'validated' | 'paid' | 'cancelled';
  issue_date: string;
  due_date: string | null;
  subtotal: number;
  tva_amount: number;
  discount_percent: number;
  discount_amount: number;
  total: number;
  fodec_rate: number;
  fodec_amount: number;
  timbre_amount: number;
  public_token: string | null;
  notes: string;
  tags: string[];
  source_quote_id: string | null;
  converted_proforma_id: string | null;
  created_at: string;
  updated_at: string;
  clients?: Client;
  invoice_items?: InvoiceItem[];
  payments?: Payment[];
  warehouses?: Warehouse;
}

export interface Proforma {
  id: string;
  user_id: string;
  warehouse_id: string | null;
  client_id: string | null;
  proforma_number: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'converted' | 'expired';
  issue_date: string;
  valid_until: string | null;
  subtotal: number;
  tva_amount: number;
  fodec_rate: number;
  fodec_amount: number;
  timbre_amount: number;
  discount_percent: number;
  discount_amount: number;
  total: number;
  notes: string;
  tags: string[];
  converted_invoice_id: string | null;
  payment_terms: string | null;
  delivery_terms: string | null;
  public_token: string | null;
  created_at: string;
  updated_at: string;
  clients?: Client;
  proforma_items?: ProformaItem[];
  warehouses?: Warehouse;
}

export interface ProformaItem {
  id: string;
  proforma_id: string;
  product_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  tva_rate: number;
  discount_percent: number;
  total: number;
  created_at: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  product_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  tva_rate: number;
  total: number;
  created_at: string;
}

export interface Payment {
  id: string;
  invoice_id: string;
  user_id: string;
  amount: number;
  method: 'cash' | 'bank_transfer' | 'check' | 'card';
  reference: string;
  payment_date: string;
  notes: string;
  created_at: string;
}

export interface Supplier {
  id: string;
  user_id: string;
  name: string;
  contact_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  tax_id: string;
  category: string;
  notes?: string;
  company_type?: 'particulier' | 'entreprise';
  created_at: string;
}

export interface PurchaseOrder {
  id: string;
  user_id: string;
  warehouse_id: string | null;
  supplier_id: string | null;
  po_number: string;
  status: 'draft' | 'ordered' | 'received' | 'cancelled';
  order_date: string;
  subtotal: number;
  tva_amount: number;
  total: number;
  retenue_source: number;
  net_to_pay: number;
  notes: string;
  tags: string[];
  created_at: string;
  suppliers?: Supplier;
  purchase_order_items?: PurchaseOrderItem[];
  warehouses?: Warehouse;
}

export interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  tva_rate: number;
  total: number;
  created_at: string;
}

export interface Expense {
  id: string;
  user_id: string;
  category: string;
  description: string;
  amount: number;
  expense_date: string;
  tags: string[];
  receipt_url: string;
  notes: string;
  created_at: string;
}

export interface ProductionJob {
  id: string;
  user_id: string;
  invoice_id: string | null;
  client_id: string | null;
  job_number: string;
  title: string;
  technique: 'dtf' | 'uv' | 'embroidery' | 'laser';
  status: 'pending' | 'in_progress' | 'completed' | 'delivered';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  quantity: number;
  deadline: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
  clients?: Client;
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: Record<string, unknown>;
  ip_address: string;
  created_at: string;
}

export interface Quote {
  id: string;
  user_id: string;
  warehouse_id: string | null;
  client_id: string | null;
  quote_number: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'converted';
  issue_date: string;
  valid_until: string | null;
  subtotal: number;
  tva_amount: number;
  discount_percent: number;
  discount_amount: number;
  total: number;
  notes: string;
  converted_invoice_id: string | null;
  created_at: string;
  updated_at: string;
  clients?: Client;
  quote_items?: QuoteItem[];
  warehouses?: Warehouse;
}

export interface QuoteItem {
  id: string;
  quote_id: string;
  product_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  tva_rate: number;
  total: number;
  created_at: string;
}

export interface DeliveryNote {
  id: string;
  user_id: string;
  warehouse_id: string | null;
  client_id: string | null;
  invoice_id: string | null;
  dn_number: string;
  status: 'draft' | 'delivered' | 'returned';
  delivery_date: string;
  address: string;
  notes: string;
  updated_at?: string;
  created_at: string;
  clients?: Client;
  invoices?: Invoice;
  delivery_note_items?: DeliveryNoteItem[];
  warehouses?: Warehouse;
}

export interface DeliveryNoteItem {
  id: string;
  delivery_note_id: string;
  product_id: string | null;
  description: string;
  quantity: number;
  created_at: string;
}

export interface CompanySettings {
  id: string;
  user_id: string;
  company_name: string;
  company_address: string;
  company_city: string;
  company_phone: string;
  company_email: string;
  company_tax_id: string;
  company_logo_url: string;
  cachet_url?: string;
  pdf_footer: string;
  pdf_conditions: string;
  default_tva_rate: number;
  invoice_prefix: string;
  quote_prefix: string;
  proforma_prefix: string;
  po_prefix: string;
  dn_prefix: string;
  job_prefix: string;
  rn_prefix?: string;
  cn_prefix?: string;
  so_prefix?: string;
  next_invoice_seq: number;
  next_quote_seq: number;
  next_proforma_seq: number;
  next_po_seq: number;
  next_dn_seq: number;
  next_job_seq: number;
  rn_next?: number;
  cn_next?: number;
  so_next?: number;
  ttn_enabled?: boolean;
  trust_id?: string;
  digigo_config?: Record<string, unknown>;
  show_qr_code?: boolean;
  decimals?: 2 | 3;
  invoice_template?: 'free' | 'pro' | 'teewinek';
  default_timbre?: number;
  default_fodec_rate?: number;
  created_at: string;
  updated_at: string;
}

export interface SalesOrder {
  id: string;
  user_id: string;
  warehouse_id: string | null;
  so_number: string;
  client_id: string | null;
  status: 'draft' | 'confirmed' | 'in_production' | 'delivered' | 'invoiced';
  amount_ht: number;
  amount_tva: number;
  amount_ttc: number;
  delivery_date: string | null;
  linked_bl_id: string | null;
  linked_invoice_id: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
  clients?: Client;
  sales_order_items?: SalesOrderItem[];
  warehouses?: Warehouse;
}

export interface SalesOrderItem {
  id: string;
  sales_order_id: string;
  product_id: string | null;
  quantity: number;
  unit_price: number;
  tva_rate: number;
  total_ht: number;
  total_tva: number;
  total_ttc: number;
  notes: string;
  created_at: string;
}

export interface ReturnOrder {
  id: string;
  user_id: string;
  rn_number: string;
  client_id: string | null;
  invoice_id: string | null;
  sales_order_id: string | null;
  status: 'draft' | 'validated' | 'processed' | 'closed';
  return_reason: string;
  return_to_stock: boolean;
  notes: string;
  created_at: string;
  updated_at: string;
  clients?: Client;
  return_order_items?: ReturnOrderItem[];
}

export interface ReturnOrderItem {
  id: string;
  return_order_id: string;
  product_id: string | null;
  quantity: number;
  unit_price: number;
  tva_rate: number;
  total_ht: number;
  total_tva: number;
  total_ttc: number;
  notes: string;
  created_at: string;
}

export interface CreditNote {
  id: string;
  user_id: string;
  cn_number: string;
  client_id: string | null;
  invoice_id: string | null;
  return_order_id: string | null;
  type: 'total' | 'partial';
  amount_ht: number;
  amount_tva: number;
  amount_ttc: number;
  status: 'draft' | 'validated' | 'applied';
  notes: string;
  created_at: string;
  updated_at: string;
  clients?: Client;
  invoices?: Invoice;
  credit_note_items?: CreditNoteItem[];
}

export interface CreditNoteItem {
  id: string;
  credit_note_id: string;
  product_id: string | null;
  quantity: number;
  unit_price: number;
  tva_rate: number;
  total_ht: number;
  total_tva: number;
  total_ttc: number;
  notes: string;
  created_at: string;
}

export interface Attachment {
  id: string;
  entity_type: 'client' | 'supplier' | 'invoice' | 'quote' | 'purchase' | 'sales_order' | 'return_order' | 'credit_note';
  entity_id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  document_type?: string;
  tags: string[];
  uploaded_at: string;
}

export interface BankAccount {
  id: string;
  supplier_id: string;
  bank_name: string;
  rib_iban: string;
  account_holder: string;
  notes: string;
  is_default: boolean;
  created_at: string;
}

export interface TreasuryTransaction {
  id: string;
  transaction_date: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  payment_method: 'cash' | 'bank' | 'check';
  account_name: string;
  description: string;
  tags: string[];
  reference_type?: string;
  reference_id?: string;
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan: 'monthly' | 'yearly' | 'enterprise' | 'free';
  status: 'active' | 'suspended' | 'expired' | 'trial';
  start_date: string;
  end_date: string | null;
  auto_renew: boolean;
  coupon_code: string | null;
  created_at: string;
}

export interface SubscriptionPayment {
  id: string;
  subscription_id: string;
  amount: number;
  currency: string;
  payment_method: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  transaction_id: string;
  paid_at: string | null;
  created_at: string;
}

export interface Coupon {
  id: string;
  code: string;
  discount_type: 'free_years' | 'percent' | 'amount';
  discount_value: number;
  max_uses: number;
  used_count: number;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
}

export interface CouponUsage {
  id: string;
  coupon_id: string;
  user_id: string;
  subscription_id: string | null;
  used_at: string;
}

export interface TEJExport {
  id: string;
  export_date: string;
  month: number;
  year: number;
  total_retenue: number;
  line_count: number;
  file_url: string | null;
  exported_by: string | null;
  created_at: string;
}

export interface TaxRule {
  id: string;
  name: string;
  rate: number;
  type: 'tva' | 'fodec' | 'other';
  is_active: boolean;
  is_default: boolean;
  created_at: string;
}
