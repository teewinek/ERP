import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle, XCircle, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatCurrency, formatDate } from '../lib/utils';

interface InvoiceData {
  invoice_number: string;
  issue_date: string;
  total: number;
  status: string;
  client_name: string;
}

export default function VerifyInvoice() {
  const { token } = useParams<{ token: string }>();
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (token) verify(token);
  }, [token]);

  async function verify(t: string) {
    const { data, error } = await supabase
      .from('invoices')
      .select('invoice_number, issue_date, total, status, clients(name)')
      .eq('public_token', t)
      .maybeSingle();

    if (error || !data) {
      setNotFound(true);
    } else {
      setInvoice({
        invoice_number: data.invoice_number,
        issue_date: data.issue_date,
        total: data.total,
        status: data.status,
        client_name: (data.clients as any)?.name || '',
      });
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Facture introuvable</h1>
          <p className="text-slate-600">Ce lien de verification ne correspond a aucune facture enregistree.</p>
        </div>
      </div>
    );
  }

  const statusLabels: Record<string, { label: string; color: string }> = {
    draft: { label: 'Brouillon', color: 'text-slate-600 bg-slate-100' },
    validated: { label: 'Validee', color: 'text-blue-700 bg-blue-50' },
    paid: { label: 'Payee', color: 'text-emerald-700 bg-emerald-50' },
    cancelled: { label: 'Annulee', color: 'text-red-700 bg-red-50' },
  };

  const st = statusLabels[invoice?.status || ''] || statusLabels.draft;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 max-w-md w-full">
        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-emerald-500" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 text-center mb-1">Facture verifiee</h1>
        <p className="text-sm text-slate-500 text-center mb-6">Ce document est authentique et a ete emis par notre systeme.</p>

        <div className="space-y-3 bg-slate-50 rounded-xl p-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
            <FileText className="w-5 h-5 text-slate-400" />
            <div>
              <p className="text-xs text-slate-500">Numero de facture</p>
              <p className="font-semibold text-slate-900">{invoice?.invoice_number}</p>
            </div>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Client</span>
            <span className="font-medium text-slate-900">{invoice?.client_name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Date d'emission</span>
            <span className="font-medium text-slate-900">{invoice?.issue_date ? formatDate(invoice.issue_date) : '-'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Montant TTC</span>
            <span className="font-bold text-slate-900">{formatCurrency(invoice?.total || 0)}</span>
          </div>
          <div className="flex justify-between text-sm items-center">
            <span className="text-slate-500">Statut</span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${st.color}`}>{st.label}</span>
          </div>
        </div>

        <p className="text-[10px] text-slate-400 text-center mt-6">Teewinek ERP - Verification automatique</p>
      </div>
    </div>
  );
}
