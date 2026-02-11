import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, CreditCard, Printer } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatCurrency, formatDate } from '../lib/utils';
import StatusBadge from '../components/ui/StatusBadge';
import Modal from '../components/ui/Modal';
import type { Invoice, Payment } from '../types';

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [payModal, setPayModal] = useState(false);
  const [payForm, setPayForm] = useState({
    amount: 0, method: 'cash' as Payment['method'], reference: '', payment_date: new Date().toISOString().split('T')[0], notes: '',
  });

  useEffect(() => { if (id) loadInvoice(); }, [id]);

  async function loadInvoice() {
    const { data: inv } = await supabase
      .from('invoices')
      .select('*, clients(name, email, phone, address, city, tax_id), invoice_items(*)')
      .eq('id', id!)
      .maybeSingle();
    if (inv) {
      setInvoice(inv);
      const { data: pays } = await supabase.from('payments').select('*').eq('invoice_id', inv.id).order('payment_date');
      setPayments(pays || []);
    }
    setLoading(false);
  }

  async function updateStatus(status: Invoice['status']) {
    if (!invoice) return;
    await supabase.from('invoices').update({ status, updated_at: new Date().toISOString() }).eq('id', invoice.id);
    loadInvoice();
  }

  async function recordPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!invoice) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('payments').insert({
      invoice_id: invoice.id,
      user_id: user.id,
      amount: payForm.amount,
      method: payForm.method,
      reference: payForm.reference,
      payment_date: payForm.payment_date,
      notes: payForm.notes,
    });

    const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0) + payForm.amount;
    if (totalPaid >= Number(invoice.total)) {
      await supabase.from('invoices').update({ status: 'paid', updated_at: new Date().toISOString() }).eq('id', invoice.id);
    }

    setPayModal(false);
    loadInvoice();
  }

  const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0);
  const remaining = invoice ? Number(invoice.total) - totalPaid : 0;

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (!invoice) {
    return <div className="text-center py-12 text-slate-500">Facture introuvable</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/invoices')} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">{invoice.invoice_number}</h1>
              <StatusBadge status={invoice.status} />
            </div>
            <p className="text-sm text-slate-500 mt-0.5">{invoice.clients?.name || 'Client inconnu'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {invoice.status === 'draft' && (
            <button onClick={() => updateStatus('validated')} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors">
              <CheckCircle size={14} /> Valider
            </button>
          )}
          {invoice.status === 'validated' && (
            <button onClick={() => { setPayForm({ ...payForm, amount: remaining }); setPayModal(true); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition-colors">
              <CreditCard size={14} /> Paiement
            </button>
          )}
          {(invoice.status === 'draft' || invoice.status === 'validated') && (
            <button onClick={() => updateStatus('cancelled')} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 text-red-600 text-xs font-medium hover:bg-red-50 transition-colors">
              <XCircle size={14} /> Annuler
            </button>
          )}
          <button onClick={() => navigate(`/print/invoice/${invoice.id}`)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-50 transition-colors">
            <Printer size={14} /> Imprimer
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-6">
          <div className="grid grid-cols-2 gap-6 mb-6 text-sm">
            <div>
              <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-2">Informations facture</p>
              <p className="text-slate-900 font-medium">{invoice.invoice_number}</p>
              <p className="text-slate-600">Date: {formatDate(invoice.issue_date)}</p>
              {invoice.due_date && <p className="text-slate-600">Echeance: {formatDate(invoice.due_date)}</p>}
            </div>
            <div>
              <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-2">Client</p>
              <p className="text-slate-900 font-medium">{invoice.clients?.name}</p>
              {invoice.clients?.email && <p className="text-slate-600">{invoice.clients.email}</p>}
              {invoice.clients?.phone && <p className="text-slate-600">{invoice.clients.phone}</p>}
              {invoice.clients?.tax_id && <p className="text-slate-600">MF: {invoice.clients.tax_id}</p>}
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
                {invoice.invoice_items?.map((item) => (
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
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Sous-total HT</span>
              <span className="font-medium">{formatCurrency(Number(invoice.subtotal))}</span>
            </div>
            {Number(invoice.discount_amount) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Remise ({invoice.discount_percent}%)</span>
                <span className="font-medium text-red-500">-{formatCurrency(Number(invoice.discount_amount))}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">TVA</span>
              <span className="font-medium">{formatCurrency(Number(invoice.tva_amount))}</span>
            </div>
            {Number(invoice.fodec_amount) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">FODEC ({invoice.fodec_rate}%)</span>
                <span className="font-medium">{formatCurrency(Number(invoice.fodec_amount))}</span>
              </div>
            )}
            {Number(invoice.timbre_amount) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Timbre fiscal</span>
                <span className="font-medium">{formatCurrency(Number(invoice.timbre_amount))}</span>
              </div>
            )}
            <div className="flex justify-between text-base pt-2 border-t border-slate-200">
              <span className="font-semibold text-slate-900">Total TTC</span>
              <span className="font-bold text-slate-900">{formatCurrency(Number(invoice.total))}</span>
            </div>
          </div>

          {invoice.notes && (
            <div className="mt-6 p-4 rounded-xl bg-slate-50 text-sm text-slate-600">
              <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Notes</p>
              {invoice.notes}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Paiements</h3>
            <div className="space-y-2 mb-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Total facture</span>
                <span className="font-medium">{formatCurrency(Number(invoice.total))}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Paye</span>
                <span className="font-medium text-emerald-600">{formatCurrency(totalPaid)}</span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-slate-100">
                <span className="font-medium text-slate-700">Restant</span>
                <span className="font-bold text-slate-900">{formatCurrency(remaining)}</span>
              </div>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min((totalPaid / Math.max(Number(invoice.total), 1)) * 100, 100)}%` }}
              />
            </div>
          </div>

          {payments.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Historique</h3>
              <div className="space-y-2">
                {payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 text-xs">
                    <div>
                      <p className="font-medium text-slate-800 capitalize">{p.method.replace('_', ' ')}</p>
                      <p className="text-slate-500">{formatDate(p.payment_date)}</p>
                    </div>
                    <span className="font-semibold text-emerald-600">{formatCurrency(Number(p.amount))}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal open={payModal} onClose={() => setPayModal(false)} title="Enregistrer un paiement">
        <form onSubmit={recordPayment} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Montant (DT)</label>
            <input type="number" step="0.001" required value={payForm.amount}
              onChange={(e) => setPayForm({ ...payForm, amount: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Mode de paiement</label>
            <select value={payForm.method} onChange={(e) => setPayForm({ ...payForm, method: e.target.value as Payment['method'] })}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500">
              <option value="cash">Especes</option>
              <option value="bank_transfer">Virement bancaire</option>
              <option value="check">Cheque</option>
              <option value="card">Carte bancaire</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Reference</label>
            <input type="text" value={payForm.reference} onChange={(e) => setPayForm({ ...payForm, reference: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
            <input type="date" value={payForm.payment_date} onChange={(e) => setPayForm({ ...payForm, payment_date: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setPayModal(false)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">Annuler</button>
            <button type="submit" className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors">Enregistrer</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
