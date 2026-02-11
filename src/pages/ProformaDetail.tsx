import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Edit, Printer, FileCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatCurrency, formatDate } from '../lib/utils';
import StatusBadge from '../components/ui/StatusBadge';
import type { Proforma, ProformaItem, Client } from '../types';

export default function ProformaDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [proforma, setProforma] = useState<Proforma | null>(null);
  const [items, setItems] = useState<ProformaItem[]>([]);
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProforma();
  }, [id]);

  async function loadProforma() {
    const { data } = await supabase
      .from('proformas')
      .select('*, clients(*)')
      .eq('id', id)
      .single();

    if (data) {
      setProforma(data);
      setClient(data.clients);

      const { data: itemsData } = await supabase
        .from('proforma_items')
        .select('*')
        .eq('proforma_id', id)
        .order('created_at');

      setItems(itemsData || []);
    }

    setLoading(false);
  }

  async function convertToInvoice() {
    if (!proforma || !confirm('Convertir cette proforma en facture ?')) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: settings } = await supabase
        .from('company_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      const invoiceNumber = `${settings?.invoice_prefix || 'INV'}-${new Date().getFullYear()}-${String(settings?.next_invoice_seq || 1).padStart(5, '0')}`;

      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          user_id: user.id,
          client_id: proforma.client_id,
          invoice_number: invoiceNumber,
          status: 'draft',
          issue_date: new Date().toISOString().split('T')[0],
          subtotal: proforma.subtotal,
          tva_amount: proforma.tva_amount,
          fodec_rate: proforma.fodec_rate,
          fodec_amount: proforma.fodec_amount,
          timbre_amount: proforma.timbre_amount,
          discount_percent: proforma.discount_percent,
          discount_amount: proforma.discount_amount,
          total: proforma.total,
          notes: proforma.notes,
          tags: proforma.tags,
          converted_proforma_id: proforma.id,
          warehouse_id: proforma.warehouse_id
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      if (items.length > 0) {
        const invoiceItems = items.map(item => ({
          invoice_id: invoice.id,
          product_id: item.product_id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          tva_rate: item.tva_rate,
          total: item.total
        }));

        await supabase.from('invoice_items').insert(invoiceItems);
      }

      await supabase
        .from('proformas')
        .update({
          status: 'converted',
          converted_invoice_id: invoice.id
        })
        .eq('id', proforma.id);

      if (settings) {
        await supabase
          .from('company_settings')
          .update({ next_invoice_seq: (settings.next_invoice_seq || 1) + 1 })
          .eq('id', settings.id);
      }

      navigate(`/invoices/${invoice.id}`);
    } catch (error) {
      console.error('Error converting proforma:', error);
      alert('Erreur lors de la conversion');
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (!proforma) {
    return <div className="text-center py-12"><p className="text-slate-500">Proforma introuvable</p></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/proformas')} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Proforma {proforma.proforma_number}</h1>
            <p className="text-sm text-slate-500 mt-0.5">Date: {formatDate(proforma.issue_date)}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {proforma.status !== 'converted' && (
            <button onClick={convertToInvoice} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors">
              <FileCheck size={16} />
              Convertir en facture
            </button>
          )}
          <button onClick={() => navigate(`/proformas/edit/${proforma.id}`)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors">
            <Edit size={16} />
            Modifier
          </button>
          <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors">
            <Printer size={16} />
            Imprimer
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-slate-900">Details de la proforma</h2>
              <StatusBadge status={proforma.status} />
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-500">Client</label>
                  <p className="text-slate-900 font-medium">{client?.name || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">Date d emission</label>
                  <p className="text-slate-900 font-medium">{formatDate(proforma.issue_date)}</p>
                </div>
                {proforma.valid_until && (
                  <div>
                    <label className="text-sm font-medium text-slate-500">Valide jusqu au</label>
                    <p className="text-slate-900 font-medium">{formatDate(proforma.valid_until)}</p>
                  </div>
                )}
              </div>

              {proforma.payment_terms && (
                <div>
                  <label className="text-sm font-medium text-slate-500">Conditions de paiement</label>
                  <p className="text-slate-700 text-sm mt-1">{proforma.payment_terms}</p>
                </div>
              )}

              {proforma.delivery_terms && (
                <div>
                  <label className="text-sm font-medium text-slate-500">Conditions de livraison</label>
                  <p className="text-slate-700 text-sm mt-1">{proforma.delivery_terms}</p>
                </div>
              )}

              {proforma.notes && (
                <div>
                  <label className="text-sm font-medium text-slate-500">Notes</label>
                  <p className="text-slate-700 text-sm mt-1">{proforma.notes}</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-900">Lignes de la proforma</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Description</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Qte</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase">P.U.</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase">TVA</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b border-slate-50">
                      <td className="px-6 py-3 text-sm text-slate-700">{item.description}</td>
                      <td className="px-6 py-3 text-sm text-right text-slate-700">{item.quantity}</td>
                      <td className="px-6 py-3 text-sm text-right text-slate-700">{formatCurrency(Number(item.unit_price))}</td>
                      <td className="px-6 py-3 text-sm text-right text-slate-700">{item.tva_rate}%</td>
                      <td className="px-6 py-3 text-sm text-right font-semibold text-slate-900">{formatCurrency(Number(item.total))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Resume</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Sous-total HT</span>
                <span className="font-semibold text-slate-900">{formatCurrency(Number(proforma.subtotal))}</span>
              </div>
              {Number(proforma.discount_percent) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Remise ({proforma.discount_percent}%)</span>
                  <span className="font-semibold text-red-600">-{formatCurrency(Number(proforma.discount_amount))}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">TVA</span>
                <span className="font-semibold text-slate-900">{formatCurrency(Number(proforma.tva_amount))}</span>
              </div>
              {Number(proforma.fodec_rate) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">FODEC ({proforma.fodec_rate}%)</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(Number(proforma.fodec_amount))}</span>
                </div>
              )}
              {Number(proforma.timbre_amount) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Timbre</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(Number(proforma.timbre_amount))}</span>
                </div>
              )}
              <div className="pt-3 border-t border-slate-200 flex justify-between">
                <span className="font-semibold text-slate-900">Total TTC</span>
                <span className="text-xl font-bold text-brand-600">{formatCurrency(Number(proforma.total))}</span>
              </div>
            </div>
          </div>

          {client && (
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Informations client</h2>
              <div className="space-y-2 text-sm">
                <p className="font-semibold text-slate-900">{client.name}</p>
                <p className="text-slate-600">{client.address}</p>
                <p className="text-slate-600">{client.city}</p>
                {client.tax_id && <p className="text-slate-600">MF: {client.tax_id}</p>}
                {client.phone && <p className="text-slate-600">{client.phone}</p>}
                {client.email && <p className="text-slate-600">{client.email}</p>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
