import { ArrowLeft, Printer as PrinterIcon } from 'lucide-react';
import { formatDate, generateQRDataURL } from '../../lib/utils';
import type { CompanySettings } from '../../types';
import { useEffect, useState } from 'react';
import { type NavigateFunction } from 'react-router-dom';

interface DocItem {
  description: string;
  quantity: number;
  unit_price: number;
  tva_rate: number;
  discount: number;
  unit?: string;
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
}

interface TemplateProps {
  doc: DocData;
  company: CompanySettings | null;
  type: string;
  qrImage: string;
  showPricing: boolean;
  amountInWords: string;
  navigate: NavigateFunction;
}

const TYPE_LABELS: Record<string, string> = {
  invoice: 'FACTURE',
  quote: 'DEVIS',
  purchase: 'BON DE COMMANDE',
  bl: 'BON DE LIVRAISON',
  'sales-order': 'COMMANDE CLIENT',
  'credit-note': 'AVOIR',
  proforma: 'FACTURE PROFORMA',
};

const TYPE_DATE_LABELS: Record<string, Record<string, string>> = {
  invoice: { date: 'Date de facture:', due: 'Date d\'echeance:' },
  quote: { date: 'Date du devis:', due: 'Validite de l\'offre:' },
  proforma: { date: 'Date du proforma:', due: 'Validite de l\'offre:' },
  purchase: { date: 'Date commande:', due: '' },
  bl: { date: 'Date de livraison:', due: '' },
  'sales-order': { date: 'Date commande:', due: 'Date livraison:' },
  'credit-note': { date: 'Date avoir:', due: 'Facture ref:' },
};

function formatNum(n: number): string {
  return new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(n);
}

export default function TeewinekTemplate({ doc, company, type, showPricing, amountInWords, navigate }: TemplateProps) {
  const [qrImage, setQrImage] = useState('');

  useEffect(() => {
    if (doc && company?.show_qr_code) {
      const qrText = `${window.location.origin}/verify/invoice/${doc.number}`;
      generateQRDataURL(qrText).then(setQrImage).catch(() => setQrImage(''));
    }
  }, [doc, company]);

  return (
    <div>
      <div className="print:hidden flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold text-slate-900">Apercu {TYPE_LABELS[type] || 'Document'}</h1>
        <button onClick={() => window.print()} className="ml-auto flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors">
          <PrinterIcon size={16} /> Imprimer / PDF
        </button>
      </div>

      <div
        className="bg-white max-w-[210mm] mx-auto print:max-w-none print:mx-0 shadow-lg print:shadow-none"
        style={{
          minHeight: '297mm',
          padding: '15mm 20mm',
          fontFamily: "'Inter', Arial, sans-serif",
          fontSize: '11px',
          color: '#1e293b',
          position: 'relative'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', borderBottom: '2px solid #e2e8f0', paddingBottom: '20px' }}>
          <div style={{ maxWidth: '50%' }}>
            {company?.company_logo_url ? (
              <img src={company.company_logo_url} alt="Logo" style={{ height: '65px', marginBottom: '12px', objectFit: 'contain' }} />
            ) : (
              <div style={{ marginBottom: '12px' }}>
                <p style={{ fontSize: '20px', fontWeight: 700, color: '#06c6a9', marginBottom: '2px' }}>{company?.company_name || 'teewinek'}</p>
                <p style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic' }}>Impression sur tout support</p>
              </div>
            )}

            <div style={{ fontSize: '9.5px', color: '#475569', lineHeight: '1.8' }}>
              {company?.company_address && (
                <p style={{ marginBottom: '2px' }}>siege social : {company.company_address}</p>
              )}
              {company?.company_tax_id && (
                <p style={{ marginBottom: '2px' }}>Matricule fiscale : {company.company_tax_id}</p>
              )}
              {company?.company_phone && (
                <p style={{ marginBottom: '2px' }}>TEL (216) : {company.company_phone}</p>
              )}
              {company?.company_email && (
                <p>EMAIL : {company.company_email}</p>
              )}
            </div>
          </div>

          <div style={{ textAlign: 'right', maxWidth: '48%' }}>
            <h2 style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', marginBottom: '6px', letterSpacing: '-0.5px' }}>
              {TYPE_LABELS[type] || 'DOCUMENT'}
            </h2>
            <p style={{ fontSize: '11px', marginBottom: '12px', color: '#475569' }}>
              Numero : <span style={{ fontWeight: 700, color: '#0f172a' }}>{doc.number}</span>
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'auto auto', gap: '4px 12px', fontSize: '10px', textAlign: 'left', marginBottom: '12px' }}>
              <span style={{ color: '#64748b' }}>{TYPE_DATE_LABELS[type]?.date || 'Date:'}</span>
              <span style={{ fontWeight: 600, color: '#0f172a' }}>{formatDate(doc.date)}</span>

              {doc.due_date && (
                <>
                  <span style={{ color: '#64748b' }}>{TYPE_DATE_LABELS[type]?.due || 'Echeance:'}</span>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>{formatDate(doc.due_date)}</span>
                </>
              )}

              {doc.payment_mode && (
                <>
                  <span style={{ color: '#64748b' }}>Mode de paiement:</span>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>{doc.payment_mode}</span>
                </>
              )}

              {doc.purchase_order && (
                <>
                  <span style={{ color: '#64748b' }}>Bon de commande:</span>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>{doc.purchase_order}</span>
                </>
              )}

              <span style={{ color: '#64748b' }}>Note:</span>
              <span style={{ fontWeight: 400, color: '#64748b' }}>.......................................</span>
            </div>

            {qrImage && (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <img src={qrImage} alt="QR Code" style={{ width: '90px', height: '90px', border: '2px solid #e2e8f0', borderRadius: '4px', padding: '4px' }} />
              </div>
            )}
          </div>
        </div>

        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '12px 14px', marginBottom: '20px' }}>
          <p style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', marginBottom: '6px', textTransform: 'uppercase' }}>
            Adresse de facturation
          </p>
          <p style={{ fontWeight: 600, fontSize: '12px', marginBottom: '3px', color: '#0f172a' }}>{doc.client_name}</p>
          {doc.client_address && <p style={{ fontSize: '10px', color: '#475569' }}>{doc.client_address}</p>}
          {doc.client_city && <p style={{ fontSize: '10px', color: '#475569' }}>{doc.client_city}</p>}
          {doc.client_tax_id && (
            <p style={{ fontSize: '10px', color: '#475569', marginTop: '4px' }}>
              MF CLIENTS : {doc.client_tax_id}
            </p>
          )}
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px', border: '1px solid #e2e8f0' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #cbd5e1' }}>
              <th style={{ textAlign: 'center', padding: '10px 8px', fontSize: '10px', fontWeight: 700, color: '#475569', width: '40px' }}>#</th>
              <th style={{ textAlign: 'left', padding: '10px 8px', fontSize: '10px', fontWeight: 700, color: '#475569' }}>Name</th>
              <th style={{ textAlign: 'center', padding: '10px 8px', fontSize: '10px', fontWeight: 700, color: '#475569', width: '80px' }}>Quantite</th>
              <th style={{ textAlign: 'center', padding: '10px 8px', fontSize: '10px', fontWeight: 700, color: '#475569', width: '60px' }}>Unites</th>
              {showPricing && <th style={{ textAlign: 'right', padding: '10px 8px', fontSize: '10px', fontWeight: 700, color: '#475569', width: '90px' }}>Prix unitaire</th>}
              {showPricing && <th style={{ textAlign: 'right', padding: '10px 8px', fontSize: '10px', fontWeight: 700, color: '#475569', width: '80px' }}>Remise</th>}
              {showPricing && <th style={{ textAlign: 'right', padding: '10px 8px', fontSize: '10px', fontWeight: 700, color: '#475569', width: '100px' }}>Total HT</th>}
            </tr>
          </thead>
          <tbody>
            {doc.items.map((item, i) => {
              const lineTotal = item.quantity * item.unit_price * (1 - (item.discount || 0) / 100);
              return (
                <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '10px 8px', fontSize: '11px', color: '#64748b', textAlign: 'center' }}>{i + 1}</td>
                  <td style={{ padding: '10px 8px', fontSize: '11px', color: '#1e293b', fontWeight: 500 }}>{item.description}</td>
                  <td style={{ padding: '10px 8px', fontSize: '11px', color: '#1e293b', textAlign: 'center' }}>{formatNum(item.quantity)}</td>
                  <td style={{ padding: '10px 8px', fontSize: '11px', color: '#1e293b', textAlign: 'center' }}>{item.unit || '1'}</td>
                  {showPricing && <td style={{ padding: '10px 8px', fontSize: '11px', color: '#1e293b', textAlign: 'right' }}>{formatNum(item.unit_price)}</td>}
                  {showPricing && <td style={{ padding: '10px 8px', fontSize: '11px', color: '#1e293b', textAlign: 'right' }}>{formatNum(item.discount || 0)}</td>}
                  {showPricing && <td style={{ padding: '10px 8px', fontSize: '11px', color: '#1e293b', textAlign: 'right', fontWeight: 600 }}>dt {formatNum(lineTotal)}</td>}
                </tr>
              );
            })}
          </tbody>
        </table>

        {showPricing && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', gap: '24px' }}>
              <div style={{ flex: '1', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '14px 16px' }}>
                <p style={{ fontSize: '11px', fontWeight: 700, marginBottom: '6px', color: '#0f172a' }}>Montant en toutes lettres</p>
                <p style={{ fontSize: '11px', color: '#334155', lineHeight: '1.5', fontWeight: 500 }}>{amountInWords}</p>
              </div>

              <div style={{ width: '280px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '11px' }}>
                  <span style={{ color: '#64748b' }}>Total HT</span>
                  <span style={{ fontWeight: 600 }}>dt {formatNum(doc.subtotal)}</span>
                </div>

                {doc.fodec_amount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '11px' }}>
                    <span style={{ color: '#64748b' }}>Fodec {doc.fodec_rate}%</span>
                    <span style={{ fontWeight: 600 }}>dt {formatNum(doc.fodec_amount)}</span>
                  </div>
                )}

                {doc.timbre > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '11px' }}>
                    <span style={{ color: '#64748b' }}>Timbre</span>
                    <span style={{ fontWeight: 600 }}>dt {formatNum(doc.timbre)}</span>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '13px', fontWeight: 700, borderTop: '2px solid #e2e8f0', marginTop: '6px' }}>
                  <span style={{ color: '#0f172a' }}>Total</span>
                  <span style={{ fontSize: '14px', color: '#0f172a' }}>dt {formatNum(doc.total)}</span>
                </div>
              </div>
            </div>
          </>
        )}

        {(doc.notes || company?.pdf_conditions) && (
          <div style={{ marginBottom: '20px' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, marginBottom: '6px', color: '#0f172a' }}>Conditions & mentions</p>
            <p style={{ fontSize: '10px', color: '#475569', lineHeight: '1.6', fontStyle: 'italic' }}>
              {company?.pdf_conditions || '(Conditions & mentions a definir dans les parametres.)'}
            </p>
          </div>
        )}

        <div style={{ position: 'absolute', bottom: '15mm', left: '20mm', right: '20mm' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '12px', marginBottom: '8px' }}>
            <div style={{ fontSize: '9px', color: '#64748b', lineHeight: '1.7' }}>
              <p style={{ fontWeight: 700, color: '#475569', marginBottom: '3px' }}>siege social</p>
              {company?.company_address && <p>{company.company_address} .</p>}
              {company?.company_city && <p>{company.company_city} .</p>}
            </div>
            <div style={{ fontSize: '9px', color: '#64748b', lineHeight: '1.7', textAlign: 'center' }}>
              <p style={{ fontWeight: 700, color: '#475569', marginBottom: '3px' }}>web / mail</p>
              <p>www.teewinek .com</p>
              {company?.company_email && <p>{company.company_email}</p>}
            </div>
            <div style={{ fontSize: '9px', color: '#64748b', lineHeight: '1.7', textAlign: 'right' }}>
              <p style={{ fontWeight: 700, color: '#475569', marginBottom: '3px' }}>tel //:</p>
              {company?.company_phone && <p>{company.company_phone}</p>}
            </div>
          </div>

          <div style={{ background: '#0f172a', color: 'white', padding: '8px 12px', textAlign: 'center', fontSize: '8px', fontWeight: 500 }}>
            www.teewinek.com &nbsp;&nbsp; Banque BIAT - IBAN :TN59 + RIB - IBAN :TN59 + RIB : R.I.B : 08136030071000072092
          </div>
        </div>
      </div>
    </div>
  );
}
