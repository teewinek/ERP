import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, Search, Eye, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import StatusBadge from '../components/ui/StatusBadge';
import EmptyState from '../components/ui/EmptyState';
import type { Invoice } from '../types';

export default function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const navigate = useNavigate();

  useEffect(() => { loadInvoices(); }, []);

  async function loadInvoices() {
    const { data } = await supabase
      .from('invoices')
      .select('*, clients(name)')
      .order('created_at', { ascending: false });
    setInvoices(data || []);
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cette facture ?')) return;
    await supabase.from('invoices').delete().eq('id', id);
    loadInvoices();
  }

  const filtered = invoices
    .filter((inv) => filterStatus === 'all' || inv.status === filterStatus)
    .filter((inv) =>
      inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      (inv.clients?.name || '').toLowerCase().includes(search.toLowerCase())
    );

  const statuses = [
    { value: 'all', label: 'Toutes' },
    { value: 'draft', label: 'Brouillon' },
    { value: 'validated', label: 'Validee' },
    { value: 'paid', label: 'Payee' },
    { value: 'cancelled', label: 'Annulee' },
  ];

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Factures</h1>
          <p className="text-sm text-slate-500 mt-0.5">{invoices.length} factures</p>
        </div>
        <button onClick={() => navigate('/invoices/new')} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors">
          <Plus size={16} />
          <span className="hidden sm:inline">Nouvelle facture</span>
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
        <EmptyState icon={<FileText size={32} />} title="Aucune facture" description="Creez votre premiere facture"
          action={<button onClick={() => navigate('/invoices/new')} className="px-4 py-2 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors">Creer une facture</button>} />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Numero</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Client</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Date</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Statut</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Total TTC</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-20"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv) => (
                  <tr key={inv.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => navigate(`/invoices/${inv.id}`)}>
                    <td className="px-5 py-3.5">
                      <span className="text-sm font-semibold text-slate-900">{inv.invoice_number}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-slate-700">{inv.clients?.name || '-'}</span>
                    </td>
                    <td className="px-5 py-3.5 hidden sm:table-cell">
                      <span className="text-sm text-slate-500">{formatDate(inv.issue_date)}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="text-sm font-semibold text-slate-900">{formatCurrency(Number(inv.total))}</span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => navigate(`/invoices/${inv.id}`)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"><Eye size={14} /></button>
                        <button onClick={() => handleDelete(inv.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500"><Trash2 size={14} /></button>
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
