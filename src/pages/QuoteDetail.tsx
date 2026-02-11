import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, ArrowRightCircle, Printer, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatCurrency, formatDate, generateInvoiceNumber } from '../lib/utils';
import StatusBadge from '../components/ui/StatusBadge';
import type { Quote } from '../types';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon', sent: 'Envoye', accepted: 'Accepte', rejected: 'Rejete', converted: 'Converti',
};

export default function QuoteDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (id) loadQuote(); }, [id]);

  async function loadQuote() {
    const { data } = await supabase
      .from('quotes')
      .select('*, clients(name, email, phone, address, city, tax_id), quote_items(*)')
      .eq('id', id!)
      .maybeSingle();
    if (data) setQuote(data);
    setLoading(false);
  }

  async function updateStatus(status: Quote['status']) {
    if (!quote) return;
    await supabase.from('quotes').update({ status, updated_at: new Date().toISOString() }).eq('id', quote.id);
    loadQuote();
  }

  async function convertToInvoice() {
    if (!quote) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: inv } = await supabase.from('invoices').insert({
      user_id: user.id,
      client_id: quote.client_id,
      invoice_number: generateInvoiceNumber(),
      status: 'draft',
      issue_date: new Date().toISOString().split('T')[0],
      subtotal: quote.subtotal,
      tva_amount: quote.tva_amount,
      discount_percent: quote.discount_percent,
      discount_amount: quote.discount_amount,
      total: quote.total,
      notes: quote.notes,
      source_quote_id: quote.id,
    }).select().maybeSingle();

    if (!inv) return;

    if (quote.quote_items && quote.quote_items.length > 0) {
      await supabase.from('invoice_items').insert(
        quote.quote_items.map((it) => ({
          invoice_id: inv.id,
          product_id: it.product_id,
          description: it.description,
          quantity: it.quantity,
          unit_price: it.unit_price,
          tva_rate: it.tva_rate,
          total: it.total,
        }))
      );
    }

    await supabase.from('quotes').update({
      status: 'converted',
      converted_invoice_id: inv.id,
      updated_at: new Date().toISOString(),
    }).eq('id', quote.id);

    navigate(`/invoices/${inv.id}`);
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>;
  }
  if (!quote) {
    return <div className="text-center py-12 text-slate-500">Devis introuvable</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/quotes')} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"><ArrowLeft size={20} /></button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">{quote.quote_number}</h1>
              <StatusBadge status={quote.status} label={STATUS_LABELS[quote.status]} />
            </div>
            <p className="text-sm text-slate-500 mt-0.5">{quote.clients?.name || 'Client inconnu'}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-50 transition-colors">
            <Printer size={14} /> Imprimer
          </button>
          {quote.status === 'draft' && (
            <button onClick={() => updateStatus('sent')} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-medium transition-colors">
              <Send size={14} /> Envoyer
            </button>
          )}
          {quote.status === 'sent' && (
            <>
              <button onClick={() => updateStatus('accepted')} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition-colors">
                <CheckCircle size={14} /> Accepter
              </button>
              <button onClick={() => updateStatus('rejected')} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 text-red-600 text-xs font-medium hover:bg-red-50 transition-colors">
                <XCircle size={14} /> Rejeter
              </button>
            </>
          )}
          {quote.status === 'accepted' && !quote.converted_invoice_id && (
            <button onClick={convertToInvoice} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium transition-colors">
              <ArrowRightCircle size={14} /> Convertir en facture
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <div className="grid grid-cols-2 gap-6 mb-6 text-sm">
          <div>
            <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-2">Informations devis</p>
            <p className="text-slate-900 font-medium">{quote.quote_number}</p>
            <p className="text-slate-600">Date: {formatDate(quote.issue_date)}</p>
            {quote.valid_until && <p className="text-slate-600">Valide jusqu'au: {formatDate(quote.valid_until)}</p>}
          </div>
          <div>
            <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-2">Client</p>
            <p className="text-slate-900 font-medium">{quote.clients?.name}</p>
            {quote.clients?.email && <p className="text-slate-600">{quote.clients.email}</p>}
            {quote.clients?.phone && <p className="text-slate-600">{quote.clients.phone}</p>}
            {quote.clients?.tax_id && <p className="text-slate-600">MF: {quote.clients.tax_id}</p>}
          </div>
        </div>

        <div className="border-t border-slate-100 pt-4">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-2 text-xs font-semibold text-slate-500 uppercase">Description</th>
                <th className="text-right py-2 text-xs font-semibold text-slate-500 uppercase">Qte</th>
                <th className="text-right py-2 text-xs font-semibold text-slate-500 uppercase">Prix HT</th>
                <th className="text-right py-2 text-xs font-semibold text-slate-500 uppercase">TVA</th>
                <th className="text-right py-2 text-xs font-semibold text-slate-500 uppercase">Total</th>
              </tr>
            </thead>
            <tbody>
              {quote.quote_items?.map((item) => (
                <tr key={item.id} className="border-b border-slate-50">
                  <td className="py-3 text-sm text-slate-800">{item.description}</td>
                  <td className="py-3 text-sm text-right text-slate-600">{item.quantity}</td>
                  <td className="py-3 text-sm text-right text-slate-600">{formatCurrency(Number(item.unit_price))}</td>
                  <td className="py-3 text-sm text-right text-slate-600">{item.tva_rate}%</td>
                  <td className="py-3 text-sm text-right font-medium text-slate-800">{formatCurrency(Number(item.quantity) * Number(item.unit_price))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 max-w-xs ml-auto">
          <div className="flex justify-between text-sm"><span className="text-slate-500">Sous-total HT</span><span className="font-medium">{formatCurrency(Number(quote.subtotal))}</span></div>
          {Number(quote.discount_amount) > 0 && (
            <div className="flex justify-between text-sm"><span className="text-slate-500">Remise ({quote.discount_percent}%)</span><span className="font-medium text-red-500">-{formatCurrency(Number(quote.discount_amount))}</span></div>
          )}
          <div className="flex justify-between text-sm"><span className="text-slate-500">TVA</span><span className="font-medium">{formatCurrency(Number(quote.tva_amount))}</span></div>
          <div className="flex justify-between text-base pt-2 border-t border-slate-200">
            <span className="font-semibold text-slate-900">Total TTC</span>
            <span className="font-bold text-slate-900">{formatCurrency(Number(quote.total))}</span>
          </div>
        </div>

        {quote.notes && (
          <div className="mt-6 p-4 rounded-xl bg-slate-50 text-sm text-slate-600">
            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Notes</p>
            {quote.notes}
          </div>
        )}
      </div>
    </div>
  );
}
