import { useEffect, useState } from 'react';
import { useParams, useNavigate, type NavigateFunction } from 'react-router-dom';
import { ArrowLeft, Printer as PrinterIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatDate, numberToFrenchWords, generateQRDataURL } from '../lib/utils';
import type { CompanySettings } from '../types';
import TeewinekTemplate from '../components/print/TeewinekTemplate';

interface DocItem {
  description: string;
  quantity: number;
  unit_price: number;
  tva_rate: number;
  discount: number;
}

interface DocData {
  number: string;
  date: string;
  due_date?: string;
  payment_mode?: string;
  purchase_order?: string;
  client_name: string;
  client_address: string;
  client_city: string;
  client_email: string;
  client_phone: string;
  client_tax_id: string;
  items: DocItem[];
  subtotal: number;
  tva_amount: number;
  fodec_amount: number;
  fodec_rate: number;
  timbre: number;
  discount_percent: number;
  discount_amount: number;
  total: number;
  notes: string;
  retenue?: number;
  net_to_pay?: number;
  source_ref?: string;
}

const TYPE_LABELS: Record<string, string> = {
  invoice: 'FACTURE',
  quote: 'DEVIS',
  purchase: 'BON DE COMMANDE',
  bl: 'BON DE LIVRAISON',
  'sales-order': 'COMMANDE CLIENT',
  'credit-note': 'AVOIR',
};

const TYPE_DATE_LABELS: Record<string, Record<string, string>> = {
  invoice: { date: 'Date de facture:', due: 'Date d\'echeance:' },
  quote: { date: 'Date du devis:', due: 'Validite de l\'offre:' },
  purchase: { date: 'Date commande:', due: '' },
  bl: { date: 'Date de livraison:', due: '' },
  'sales-order': { date: 'Date commande:', due: 'Date livraison:' },
  'credit-note': { date: 'Date avoir:', due: 'Facture ref:' },
};

function formatNum(n: number): string {
  return new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(n);
}

export default function PrintDocument() {
  const { type, id } = useParams<{ type: string; id: string }>();
  const navigate = useNavigate();
  const [doc, setDoc] = useState<DocData | null>(null);
  const [company, setCompany] = useState<CompanySettings | null>(null);
  const [qrImage, setQrImage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (type && id) loadDoc();
  }, [type, id]);

  useEffect(() => {
    if (doc && company?.show_qr_code) {
      const qrText = `${window.location.origin}/verify/invoice/${doc.number}`;
      generateQRDataURL(qrText).then(setQrImage).catch(() => setQrImage(''));
    }
  }, [doc, company]);

  async function loadDoc() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [csRes] = await Promise.all([
      supabase.from('company_settings').select('*').eq('user_id', user.id).maybeSingle(),
    ]);
    setCompany(csRes.data);

    if (type === 'invoice') {
      const { data } = await supabase.from('invoices').select('*, clients(*), invoice_items(*)').eq('id', id!).maybeSingle();
      if (data) {
        const items = (data.invoice_items || []).map((it: any) => ({
          description: it.description, quantity: it.quantity, unit_price: it.unit_price, tva_rate: it.tva_rate, discount: 0,
        }));
        setDoc({
          number: data.invoice_number, date: data.issue_date, due_date: data.due_date,
          client_name: data.clients?.name || '', client_address: data.clients?.address || '',
          client_city: data.clients?.city || '', client_email: data.clients?.email || '',
          client_phone: data.clients?.phone || '', client_tax_id: data.clients?.tax_id || '',
          items, subtotal: data.subtotal, tva_amount: data.tva_amount,
          fodec_amount: data.fodec_amount || 0, fodec_rate: data.fodec_rate || 0,
          timbre: data.timbre_amount || 0, discount_percent: data.discount_percent,
          discount_amount: data.discount_amount, total: data.total,
          notes: data.notes || '', payment_mode: 'VIREMENT',
        });
      }
    } else if (type === 'quote') {
      const { data } = await supabase.from('quotes').select('*, clients(*), quote_items(*)').eq('id', id!).maybeSingle();
      if (data) {
        const items = (data.quote_items || []).map((it: any) => ({
          description: it.description, quantity: it.quantity, unit_price: it.unit_price, tva_rate: it.tva_rate, discount: 0,
        }));
        setDoc({
          number: data.quote_number, date: data.issue_date, due_date: data.valid_until,
          client_name: data.clients?.name || '', client_address: data.clients?.address || '',
          client_city: data.clients?.city || '', client_email: data.clients?.email || '',
          client_phone: data.clients?.phone || '', client_tax_id: data.clients?.tax_id || '',
          items, subtotal: data.subtotal, tva_amount: data.tva_amount,
          fodec_amount: 0, fodec_rate: 0, timbre: 0, discount_percent: data.discount_percent,
          discount_amount: data.discount_amount, total: data.total,
          notes: data.notes || '', payment_mode: 'VIREMENT',
        });
      }
    } else if (type === 'purchase') {
      const { data } = await supabase.from('purchase_orders').select('*, suppliers(*), purchase_order_items(*)').eq('id', id!).maybeSingle();
      if (data) {
        const items = (data.purchase_order_items || []).map((it: any) => ({
          description: it.description, quantity: it.quantity, unit_price: it.unit_price, tva_rate: it.tva_rate, discount: 0,
        }));
        setDoc({
          number: data.po_number, date: data.order_date,
          client_name: data.suppliers?.name || '', client_address: data.suppliers?.address || '',
          client_city: data.suppliers?.city || '', client_email: data.suppliers?.email || '',
          client_phone: data.suppliers?.phone || '', client_tax_id: data.suppliers?.tax_id || '',
          items, subtotal: data.subtotal, tva_amount: data.tva_amount,
          fodec_amount: 0, fodec_rate: 0, timbre: 0, discount_percent: 0, discount_amount: 0,
          total: data.total, notes: data.notes || '',
          retenue: data.retenue_source, net_to_pay: data.net_to_pay,
        });
      }
    } else if (type === 'bl') {
      const { data } = await supabase.from('delivery_notes').select('*, clients(*), delivery_note_items(*)').eq('id', id!).maybeSingle();
      if (data) {
        const items = (data.delivery_note_items || []).map((it: any) => ({
          description: it.description, quantity: it.quantity, unit_price: 0, tva_rate: 0, discount: 0,
        }));
        setDoc({
          number: data.dn_number, date: data.delivery_date,
          client_name: data.clients?.name || '', client_address: data.clients?.address || data.address || '',
          client_city: data.clients?.city || '', client_email: data.clients?.email || '',
          client_phone: data.clients?.phone || '', client_tax_id: data.clients?.tax_id || '',
          items, subtotal: 0, tva_amount: 0, fodec_amount: 0, fodec_rate: 0, timbre: 0,
          discount_percent: 0, discount_amount: 0, total: 0, notes: data.notes || '',
        });
      }
    } else if (type === 'sales-order') {
      const { data } = await supabase.from('sales_orders').select('*, clients(*), sales_order_items(*)').eq('id', id!).maybeSingle();
      if (data) {
        const items = (data.sales_order_items || []).map((it: any) => ({
          description: it.notes || '', quantity: it.quantity, unit_price: it.unit_price, tva_rate: it.tva_rate, discount: 0,
        }));
        setDoc({
          number: data.so_number, date: data.created_at, due_date: data.delivery_date,
          client_name: data.clients?.name || '', client_address: data.clients?.address || '',
          client_city: data.clients?.city || '', client_email: data.clients?.email || '',
          client_phone: data.clients?.phone || '', client_tax_id: data.clients?.tax_id || '',
          items, subtotal: data.amount_ht, tva_amount: data.amount_tva,
          fodec_amount: 0, fodec_rate: 0, timbre: 0, discount_percent: 0, discount_amount: 0,
          total: data.amount_ttc, notes: data.notes || '',
        });
      }
    } else if (type === 'credit-note') {
      const { data } = await supabase.from('credit_notes').select('*, clients(*), invoices(invoice_number), credit_note_items(*)').eq('id', id!).maybeSingle();
      if (data) {
        const items = (data.credit_note_items || []).map((it: any) => ({
          description: it.notes || '', quantity: it.quantity, unit_price: it.unit_price, tva_rate: it.tva_rate, discount: 0,
        }));
        setDoc({
          number: data.cn_number, date: data.created_at,
          due_date: data.invoices?.invoice_number || '',
          client_name: data.clients?.name || '', client_address: data.clients?.address || '',
          client_city: data.clients?.city || '', client_email: data.clients?.email || '',
          client_phone: data.clients?.phone || '', client_tax_id: data.clients?.tax_id || '',
          items, subtotal: data.amount_ht, tva_amount: data.amount_tva,
          fodec_amount: 0, fodec_rate: 0, timbre: 0, discount_percent: 0, discount_amount: 0,
          total: data.amount_ttc, notes: data.notes || '',
          source_ref: data.invoices?.invoice_number,
        });
      }
    }
    setLoading(false);
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>;
  }
  if (!doc) return <div className="text-center py-12 text-slate-500">Document introuvable</div>;

  const isBL = type === 'bl';
  const isCreditNote = type === 'credit-note';
  const showPricing = !isBL;
  const amountInWords = showPricing ? numberToFrenchWords(doc.total) : '';
  const template = company?.invoice_template || 'pro';

  if (template === 'teewinek') {
    return <TeewinekTemplate doc={doc} company={company} type={type || ''} qrImage={qrImage} showPricing={showPricing} amountInWords={amountInWords} navigate={navigate} />;
  }

  if (template === 'free') {
    return <FreeTemplate doc={doc} company={company} type={type || ''} qrImage={qrImage} isBL={isBL} isCreditNote={isCreditNote} showPricing={showPricing} amountInWords={amountInWords} navigate={navigate} />;
  }

  return <ProTemplate doc={doc} company={company} type={type || ''} qrImage={qrImage} isBL={isBL} isCreditNote={isCreditNote} showPricing={showPricing} amountInWords={amountInWords} navigate={navigate} />;
}

interface TemplateProps {
  doc: DocData;
  company: CompanySettings | null;
  type: string;
  qrImage: string;
  isBL: boolean;
  isCreditNote: boolean;
  showPricing: boolean;
  amountInWords: string;
  navigate: NavigateFunction;
}

function ProTemplate({ doc, company, type, qrImage, isCreditNote, showPricing, amountInWords, navigate }: TemplateProps) {
  return (
    <div>
      <div className="print:hidden flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"><ArrowLeft size={20} /></button>
        <h1 className="text-xl font-bold text-slate-900">Apercu {TYPE_LABELS[type] || 'Document'}</h1>
        <button onClick={() => window.print()} className="ml-auto flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors">
          <PrinterIcon size={16} /> Imprimer / PDF
        </button>
      </div>

      <div className="bg-white max-w-[210mm] mx-auto print:max-w-none print:mx-0 shadow-lg print:shadow-none" style={{ minHeight: '297mm', padding: '15mm 20mm', fontFamily: "'Inter', Arial, sans-serif", fontSize: '11px', color: '#1e293b', position: 'relative' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div style={{ maxWidth: '55%' }}>
            {company?.company_logo_url && (
              <img src={company.company_logo_url} alt="Logo" style={{ height: '56px', marginBottom: '10px', objectFit: 'contain' }} />
            )}
            {company?.company_name && (
              <p style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>{company.company_name}</p>
            )}
            <div style={{ fontSize: '10px', color: '#475569', lineHeight: '1.7' }}>
              {company?.company_address && <p>Siege social : {company.company_address} {company.company_city}</p>}
              {company?.company_tax_id && <p>Matricule fiscale : {company.company_tax_id}</p>}
              {company?.company_phone && <p>TEL (216) : {company.company_phone}</p>}
              {company?.company_email && <p>EMAIL : {company.company_email}</p>}
            </div>
          </div>

          <div style={{ textAlign: 'right', maxWidth: '45%' }}>
            <h2 style={{ fontSize: '28px', fontWeight: 800, color: isCreditNote ? '#dc2626' : '#0f172a', marginBottom: '4px', letterSpacing: '-0.5px' }}>
              {TYPE_LABELS[type] || 'DOCUMENT'}
            </h2>
            <p style={{ fontSize: '11px', marginBottom: '12px' }}>
              Numero : <span style={{ fontWeight: 600 }}>{doc.number}</span>
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'auto auto', gap: '2px 16px', fontSize: '10px', textAlign: 'left' }}>
              <span style={{ color: '#64748b' }}>{TYPE_DATE_LABELS[type]?.date || 'Date:'}</span>
              <span style={{ fontWeight: 600 }}>{formatDate(doc.date)}</span>

              {doc.due_date && (
                <>
                  <span style={{ color: '#64748b' }}>{TYPE_DATE_LABELS[type]?.due || 'Echeance:'}</span>
                  <span style={{ fontWeight: 600 }}>{type === 'credit-note' ? doc.due_date : formatDate(doc.due_date)}</span>
                </>
              )}

              {doc.payment_mode && (
                <>
                  <span style={{ color: '#64748b' }}>Mode de paiement:</span>
                  <span style={{ fontWeight: 600 }}>{doc.payment_mode}</span>
                </>
              )}
            </div>

            {qrImage && (
              <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                <img src={qrImage} alt="QR Code" style={{ width: '80px', height: '80px' }} />
              </div>
            )}
          </div>
        </div>

        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px 16px', marginBottom: '20px' }}>
          <p style={{ fontSize: '10px', fontWeight: 700, color: '#06c6a9', marginBottom: '6px' }}>
            {type === 'purchase' ? 'Adresse du fournisseur' : 'Adresse de facturation'}
          </p>
          <p style={{ fontWeight: 600, fontSize: '12px', marginBottom: '2px' }}>{doc.client_name}</p>
          {doc.client_address && <p style={{ fontSize: '10px', color: '#475569' }}>{doc.client_address}</p>}
          {doc.client_city && <p style={{ fontSize: '10px', color: '#475569' }}>{doc.client_city}</p>}
          {doc.client_tax_id && (
            <p style={{ fontSize: '10px', color: '#475569', marginTop: '4px' }}>
              MF {type === 'purchase' ? 'FOURNISSEUR' : 'CLIENT'} : {doc.client_tax_id}
            </p>
          )}
        </div>

        {isCreditNote && doc.source_ref && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 16px', marginBottom: '16px', fontSize: '11px' }}>
            <span style={{ fontWeight: 600, color: '#991b1b' }}>AVOIR</span>
            <span style={{ color: '#7f1d1d', marginLeft: '8px' }}>Ref. facture d'origine : {doc.source_ref}</span>
          </div>
        )}

        <ItemsTable items={doc.items} showPricing={showPricing} />

        {showPricing && (
          <TotalsSummary doc={doc} amountInWords={amountInWords} />
        )}

        <ConditionsBlock doc={doc} company={company} />
        {company?.cachet_url && <CachetBlock cachetUrl={company.cachet_url} />}
        <FooterBlock company={company} />
      </div>
    </div>
  );
}

function FreeTemplate({ doc, company, type, qrImage, isCreditNote, showPricing, amountInWords, navigate }: TemplateProps) {
  return (
    <div>
      <div className="print:hidden flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"><ArrowLeft size={20} /></button>
        <h1 className="text-xl font-bold text-slate-900">Apercu {TYPE_LABELS[type] || 'Document'}</h1>
        <button onClick={() => window.print()} className="ml-auto flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors">
          <PrinterIcon size={16} /> Imprimer / PDF
        </button>
      </div>

      <div className="bg-white max-w-[210mm] mx-auto print:max-w-none print:mx-0 shadow-lg print:shadow-none" style={{ minHeight: '297mm', padding: '20mm', fontFamily: "'Inter', Arial, sans-serif", fontSize: '11px', color: '#1e293b', position: 'relative' }}>

        <div style={{ borderBottom: '3px solid #0f172a', paddingBottom: '16px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              {company?.company_name && (
                <p style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>{company.company_name}</p>
              )}
              <div style={{ fontSize: '10px', color: '#475569', lineHeight: '1.7', marginTop: '4px' }}>
                {company?.company_address && <p>{company.company_address} {company.company_city}</p>}
                {company?.company_tax_id && <p>MF: {company.company_tax_id}</p>}
                {company?.company_phone && <p>Tel: {company.company_phone}</p>}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <h2 style={{ fontSize: '22px', fontWeight: 800, color: isCreditNote ? '#dc2626' : '#0f172a' }}>
                {TYPE_LABELS[type] || 'DOCUMENT'}
              </h2>
              <p style={{ fontSize: '12px', fontWeight: 600, marginTop: '4px' }}>{doc.number}</p>
              <p style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>{formatDate(doc.date)}</p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', gap: '20px' }}>
          <div style={{ flex: 1, padding: '12px', background: '#f8fafc', borderRadius: '6px' }}>
            <p style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', marginBottom: '6px' }}>
              {type === 'purchase' ? 'FOURNISSEUR' : 'CLIENT'}
            </p>
            <p style={{ fontWeight: 600, fontSize: '12px' }}>{doc.client_name}</p>
            {doc.client_address && <p style={{ fontSize: '10px', color: '#475569' }}>{doc.client_address}</p>}
            {doc.client_tax_id && <p style={{ fontSize: '10px', color: '#475569', marginTop: '2px' }}>MF: {doc.client_tax_id}</p>}
          </div>
          <div style={{ width: '200px', padding: '12px', background: '#f8fafc', borderRadius: '6px' }}>
            <p style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', marginBottom: '6px' }}>DETAILS</p>
            <div style={{ fontSize: '10px', lineHeight: '1.8' }}>
              <p>Date: <span style={{ fontWeight: 600 }}>{formatDate(doc.date)}</span></p>
              {doc.due_date && <p>{TYPE_DATE_LABELS[type]?.due || 'Echeance:'} <span style={{ fontWeight: 600 }}>{type === 'credit-note' ? doc.due_date : formatDate(doc.due_date)}</span></p>}
              {doc.payment_mode && <p>Paiement: <span style={{ fontWeight: 600 }}>{doc.payment_mode}</span></p>}
            </div>
            {qrImage && <img src={qrImage} alt="QR" style={{ width: '60px', height: '60px', marginTop: '8px' }} />}
          </div>
        </div>

        {isCreditNote && doc.source_ref && (
          <div style={{ background: '#fef2f2', padding: '8px 12px', borderRadius: '4px', marginBottom: '16px', fontSize: '10px', color: '#991b1b' }}>
            AVOIR - Ref. facture d'origine : <strong>{doc.source_ref}</strong>
          </div>
        )}

        <ItemsTable items={doc.items} showPricing={showPricing} />

        {showPricing && (
          <TotalsSummary doc={doc} amountInWords={amountInWords} />
        )}

        <ConditionsBlock doc={doc} company={company} />
        {company?.cachet_url && <CachetBlock cachetUrl={company.cachet_url} />}
        <FooterBlock company={company} />
      </div>
    </div>
  );
}

function ItemsTable({ items, showPricing }: { items: DocItem[]; showPricing: boolean }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
      <thead>
        <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
          <th style={{ textAlign: 'left', padding: '8px 6px', fontSize: '10px', fontWeight: 700, color: '#475569' }}>#</th>
          <th style={{ textAlign: 'left', padding: '8px 6px', fontSize: '10px', fontWeight: 700, color: '#475569' }}>Designation</th>
          <th style={{ textAlign: 'right', padding: '8px 6px', fontSize: '10px', fontWeight: 700, color: '#475569' }}>Quantite</th>
          {showPricing && <th style={{ textAlign: 'right', padding: '8px 6px', fontSize: '10px', fontWeight: 700, color: '#475569' }}>Prix unitaire</th>}
          {showPricing && <th style={{ textAlign: 'right', padding: '8px 6px', fontSize: '10px', fontWeight: 700, color: '#475569' }}>TVA</th>}
          {showPricing && <th style={{ textAlign: 'right', padding: '8px 6px', fontSize: '10px', fontWeight: 700, color: '#475569' }}>Total HT</th>}
        </tr>
      </thead>
      <tbody>
        {items.map((item, i) => {
          const lineTotal = item.quantity * item.unit_price * (1 - (item.discount || 0) / 100);
          return (
            <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '10px 6px', fontSize: '11px', color: '#64748b' }}>{i + 1}</td>
              <td style={{ padding: '10px 6px', fontSize: '11px', color: '#1e293b' }}>{item.description}</td>
              <td style={{ padding: '10px 6px', fontSize: '11px', color: '#1e293b', textAlign: 'right' }}>{formatNum(item.quantity)}</td>
              {showPricing && <td style={{ padding: '10px 6px', fontSize: '11px', color: '#1e293b', textAlign: 'right' }}>{formatNum(item.unit_price)}</td>}
              {showPricing && <td style={{ padding: '10px 6px', fontSize: '11px', color: '#1e293b', textAlign: 'right' }}>{item.tva_rate}%</td>}
              {showPricing && <td style={{ padding: '10px 6px', fontSize: '11px', color: '#1e293b', textAlign: 'right', fontWeight: 500 }}>{formatNum(lineTotal)}</td>}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function TotalsSummary({ doc, amountInWords }: { doc: DocData; amountInWords: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', gap: '24px' }}>
      <div style={{ flex: '1', border: '1.5px dashed #cbd5e1', borderRadius: '8px', padding: '14px 16px' }}>
        <p style={{ fontSize: '11px', fontWeight: 700, marginBottom: '4px' }}>Montant en toutes lettres</p>
        <p style={{ fontSize: '11px', color: '#334155', lineHeight: '1.5' }}>{amountInWords}</p>
      </div>

      <div style={{ width: '260px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '11px' }}>
          <span style={{ color: '#64748b' }}>Total HT</span>
          <span style={{ fontWeight: 500 }}>{formatNum(doc.subtotal)}</span>
        </div>

        {doc.discount_amount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '11px' }}>
            <span style={{ color: '#64748b' }}>Remise ({doc.discount_percent}%)</span>
            <span style={{ color: '#dc2626' }}>-{formatNum(doc.discount_amount)}</span>
          </div>
        )}

        {doc.tva_amount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '11px' }}>
            <span style={{ color: '#64748b' }}>TVA</span>
            <span style={{ fontWeight: 500 }}>{formatNum(doc.tva_amount)}</span>
          </div>
        )}

        {doc.fodec_amount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '11px' }}>
            <span style={{ color: '#64748b' }}>FODEC ({doc.fodec_rate}%)</span>
            <span style={{ fontWeight: 500 }}>{formatNum(doc.fodec_amount)}</span>
          </div>
        )}

        {doc.timbre > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '11px' }}>
            <span style={{ color: '#64748b' }}>Timbre fiscal</span>
            <span style={{ fontWeight: 500 }}>{formatNum(doc.timbre)}</span>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '13px', fontWeight: 700, borderTop: '2px solid #e2e8f0', marginTop: '4px' }}>
          <span>Total TTC</span>
          <span style={{ fontSize: '15px' }}>{formatNum(doc.total)}</span>
        </div>

        {doc.retenue !== undefined && doc.retenue > 0 && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '11px', color: '#d97706' }}>
              <span>Retenue source (1%)</span>
              <span>-{formatNum(doc.retenue)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '13px', fontWeight: 700 }}>
              <span>Net a payer</span>
              <span>{formatNum(doc.net_to_pay || 0)}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ConditionsBlock({ doc, company }: { doc: DocData; company: CompanySettings | null }) {
  if (!doc.notes && !company?.pdf_conditions) return null;
  return (
    <div style={{ border: '1.5px dashed #cbd5e1', borderRadius: '8px', padding: '14px 16px', marginBottom: '20px' }}>
      <p style={{ fontSize: '11px', fontWeight: 700, marginBottom: '6px' }}>Conditions & mentions</p>
      {doc.notes && <p style={{ fontSize: '10px', color: '#475569', marginBottom: '4px' }}>{doc.notes}</p>}
      {company?.pdf_conditions && (
        <p style={{ fontSize: '10px', color: '#475569', fontStyle: 'italic' }}>{company.pdf_conditions}</p>
      )}
    </div>
  );
}

function CachetBlock({ cachetUrl }: { cachetUrl: string }) {
  return (
    <div style={{ textAlign: 'right', marginBottom: '20px' }}>
      <p style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px' }}>Cachet & Signature</p>
      <img src={cachetUrl} alt="Cachet" style={{ height: '60px', display: 'inline-block' }} />
    </div>
  );
}

function FooterBlock({ company }: { company: CompanySettings | null }) {
  return (
    <div style={{ position: 'absolute', bottom: '15mm', left: '20mm', right: '20mm' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '12px', marginBottom: '8px' }}>
        <div style={{ fontSize: '9px', color: '#64748b', lineHeight: '1.6' }}>
          <p style={{ fontWeight: 600, color: '#475569', marginBottom: '2px' }}>Siege social</p>
          {company?.company_address && <p>{company.company_address}</p>}
          {company?.company_city && <p>{company.company_city}</p>}
        </div>
        <div style={{ fontSize: '9px', color: '#64748b', lineHeight: '1.6', textAlign: 'center' }}>
          <p style={{ fontWeight: 600, color: '#475569', marginBottom: '2px' }}>Web / Email</p>
          <p>www.teewinek.com</p>
          {company?.company_email && <p>{company.company_email}</p>}
        </div>
        <div style={{ fontSize: '9px', color: '#64748b', lineHeight: '1.6', textAlign: 'right' }}>
          <p style={{ fontWeight: 600, color: '#475569', marginBottom: '2px' }}>Telephone</p>
          {company?.company_phone && <p>{company.company_phone}</p>}
        </div>
      </div>

      {company?.pdf_footer ? (
        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '8px', textAlign: 'center', fontSize: '8px', color: '#94a3b8' }}>
          {company.pdf_footer}
        </div>
      ) : (
        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '8px', textAlign: 'center', fontSize: '8px', color: '#94a3b8' }}>
          www.teewinek.com
        </div>
      )}
    </div>
  );
}
