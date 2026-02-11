import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, Search, Eye, Trash2, ArrowRightCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import StatusBadge from '../components/ui/StatusBadge';
import EmptyState from '../components/ui/EmptyState';
import type { Quote } from '../types';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  sent: 'Envoye',
  accepted: 'Accepte',
  rejected: 'Rejete',
  converted: 'Converti',
};

export default function Quotes() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const navigate = useNavigate();

  useEffect(() => { loadQuotes(); }, []);

  async function loadQuotes() {
    const { data } = await supabase
      .from('quotes')
      .select('*, clients(name)')
      .order('created_at', { ascending: false });
    setQuotes(data || []);
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer ce devis ?')) return;
    await supabase.from('quotes').delete().eq('id', id);
    loadQuotes();
  }

  const filtered = quotes
    .filter((q) => filterStatus === 'all' || q.status === filterStatus)
    .filter((q) =>
      q.quote_number.toLowerCase().includes(search.toLowerCase()) ||
      (q.clients?.name || '').toLowerCase().includes(search.toLowerCase())
    );

  const statuses = [
    { value: 'all', label: 'Tous' },
    { value: 'draft', label: 'Brouillon' },
    { value: 'sent', label: 'Envoye' },
    { value: 'accepted', label: 'Accepte' },
    { value: 'rejected', label: 'Rejete' },
    { value: 'converted', label: 'Converti' },
  ];

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Devis</h1>
          <p className="text-sm text-slate-500 mt-0.5">{quotes.length} devis</p>
        </div>
        <button onClick={() => navigate('/quotes/new')} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors">
          <Plus size={16} />
          <span className="hidden sm:inline">Nouveau devis</span>
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
        <EmptyState icon={<FileText size={32} />} title="Aucun devis" description="Creez votre premier devis"
          action={<button onClick={() => navigate('/quotes/new')} className="px-4 py-2 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors">Creer un devis</button>} />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Numero</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Client</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Date</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Validite</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Statut</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Total TTC</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-24"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((q) => (
                  <tr key={q.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => navigate(`/quotes/${q.id}`)}>
                    <td className="px-5 py-3.5"><span className="text-sm font-semibold text-slate-900">{q.quote_number}</span></td>
                    <td className="px-5 py-3.5"><span className="text-sm text-slate-700">{q.clients?.name || '-'}</span></td>
                    <td className="px-5 py-3.5 hidden sm:table-cell"><span className="text-sm text-slate-500">{formatDate(q.issue_date)}</span></td>
                    <td className="px-5 py-3.5 hidden md:table-cell"><span className="text-sm text-slate-500">{q.valid_until ? formatDate(q.valid_until) : '-'}</span></td>
                    <td className="px-5 py-3.5"><StatusBadge status={q.status} label={STATUS_LABELS[q.status]} /></td>
                    <td className="px-5 py-3.5 text-right"><span className="text-sm font-semibold text-slate-900">{formatCurrency(Number(q.total))}</span></td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => navigate(`/quotes/${q.id}`)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"><Eye size={14} /></button>
                        {q.status === 'accepted' && !q.converted_invoice_id && (
                          <button onClick={() => navigate(`/quotes/${q.id}`)} title="Convertir en facture" className="p-1.5 rounded-lg hover:bg-emerald-50 text-slate-400 hover:text-emerald-600"><ArrowRightCircle size={14} /></button>
                        )}
                        <button onClick={() => handleDelete(q.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500"><Trash2 size={14} /></button>
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
