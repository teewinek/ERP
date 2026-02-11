import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, Search, Eye, Trash2, FileCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import StatusBadge from '../components/ui/StatusBadge';
import EmptyState from '../components/ui/EmptyState';
import type { Proforma } from '../types';

export default function Proformas() {
  const [proformas, setProformas] = useState<Proforma[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const navigate = useNavigate();

  useEffect(() => { loadProformas(); }, []);

  async function loadProformas() {
    const { data } = await supabase
      .from('proformas')
      .select('*, clients(name)')
      .order('created_at', { ascending: false });
    setProformas(data || []);
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cette facture proforma ?')) return;
    await supabase.from('proformas').delete().eq('id', id);
    loadProformas();
  }

  async function convertToInvoice(proforma: Proforma) {
    if (!confirm('Convertir cette proforma en facture ?')) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: settings } = await supabase
        .from('company_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      const invoiceNumber = `${settings?.invoice_prefix || 'INV'}-${new Date().getFullYear()}-${String(settings?.next_invoice_seq || 1).padStart(5, '0')}`;

      const { data: items } = await supabase
        .from('proforma_items')
        .select('*')
        .eq('proforma_id', proforma.id);

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

      if (items && items.length > 0) {
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

      loadProformas();
      navigate(`/invoices/${invoice.id}`);
    } catch (error) {
      console.error('Error converting proforma:', error);
      alert('Erreur lors de la conversion');
    }
  }

  const filtered = proformas
    .filter((pro) => filterStatus === 'all' || pro.status === filterStatus)
    .filter((pro) =>
      pro.proforma_number.toLowerCase().includes(search.toLowerCase()) ||
      (pro.clients?.name || '').toLowerCase().includes(search.toLowerCase())
    );

  const statuses = [
    { value: 'all', label: 'Toutes' },
    { value: 'draft', label: 'Brouillon' },
    { value: 'sent', label: 'Envoyée' },
    { value: 'accepted', label: 'Acceptée' },
    { value: 'rejected', label: 'Refusée' },
    { value: 'converted', label: 'Convertie' },
    { value: 'expired', label: 'Expirée' },
  ];

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Factures Proforma</h1>
          <p className="text-sm text-slate-500 mt-0.5">{proformas.length} proformas</p>
        </div>
        <button onClick={() => navigate('/proformas/new')} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors">
          <Plus size={16} />
          <span className="hidden sm:inline">Nouvelle proforma</span>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par numero ou client..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
        </div>
        <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 overflow-x-auto">
          {statuses.map((s) => (
            <button key={s.value} onClick={() => setFilterStatus(s.value)}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap',
                filterStatus === s.value ? 'bg-brand-500 text-white' : 'text-slate-600 hover:bg-slate-50')}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<FileText size={32} />} title="Aucune proforma" description="Creez votre premiere facture proforma"
          action={<button onClick={() => navigate('/proformas/new')} className="px-4 py-2 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors">Creer une proforma</button>} />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Numero</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Client</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Date</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Valide jusqu au</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Statut</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Total TTC</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-32"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((pro) => (
                  <tr key={pro.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => navigate(`/proformas/${pro.id}`)}>
                    <td className="px-5 py-3.5">
                      <span className="text-sm font-semibold text-slate-900">{pro.proforma_number}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-slate-700">{pro.clients?.name || '-'}</span>
                    </td>
                    <td className="px-5 py-3.5 hidden sm:table-cell">
                      <span className="text-sm text-slate-500">{formatDate(pro.issue_date)}</span>
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      <span className="text-sm text-slate-500">{pro.valid_until ? formatDate(pro.valid_until) : '-'}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={pro.status} />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="text-sm font-semibold text-slate-900">{formatCurrency(Number(pro.total))}</span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        {pro.status !== 'converted' && (
                          <button onClick={() => convertToInvoice(pro)} className="p-1.5 rounded-lg hover:bg-emerald-50 text-slate-400 hover:text-emerald-600" title="Convertir en facture">
                            <FileCheck size={14} />
                          </button>
                        )}
                        <button onClick={() => navigate(`/proformas/${pro.id}`)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"><Eye size={14} /></button>
                        <button onClick={() => handleDelete(pro.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
