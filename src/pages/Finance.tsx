import { useEffect, useState } from 'react';
import {
  DollarSign, Plus, Search, Trash2, Edit2, Download, TrendingUp, TrendingDown, Wallet,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line,
} from 'recharts';
import { supabase } from '../lib/supabase';
import { formatCurrency, formatDate, EXPENSE_CATEGORIES } from '../lib/utils';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import KPICard from '../components/ui/KPICard';
import type { Invoice, Expense } from '../types';

const MONTHS = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function Finance() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [form, setForm] = useState({
    category: 'Autre', description: '', amount: 0, expense_date: new Date().toISOString().split('T')[0], tags: '', notes: '',
  });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [invRes, expRes] = await Promise.all([
      supabase.from('invoices').select('*').order('created_at', { ascending: false }),
      supabase.from('expenses').select('*').order('expense_date', { ascending: false }),
    ]);
    setInvoices(invRes.data || []);
    setExpenses(expRes.data || []);
    setLoading(false);
  }

  function openNew() {
    setEditing(null);
    setForm({ category: 'Autre', description: '', amount: 0, expense_date: new Date().toISOString().split('T')[0], tags: '', notes: '' });
    setModalOpen(true);
  }

  function openEdit(exp: Expense) {
    setEditing(exp);
    setForm({
      category: exp.category, description: exp.description, amount: exp.amount,
      expense_date: exp.expense_date, tags: (exp.tags || []).join(', '), notes: exp.notes,
    });
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const payload = {
      category: form.category,
      description: form.description,
      amount: form.amount,
      expense_date: form.expense_date,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      notes: form.notes,
    };
    if (editing) {
      await supabase.from('expenses').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('expenses').insert({ ...payload, user_id: user.id });
    }
    setModalOpen(false);
    loadData();
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cette depense ?')) return;
    await supabase.from('expenses').delete().eq('id', id);
    loadData();
  }

  const thisYear = new Date().getFullYear();
  const thisMonth = new Date().getMonth();

  const totalRevenue = invoices.filter((i) => i.status !== 'cancelled').reduce((s, i) => s + Number(i.total), 0);
  const paidRevenue = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + Number(i.total), 0);
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const monthExpenses = expenses
    .filter((e) => { const d = new Date(e.expense_date); return d.getMonth() === thisMonth && d.getFullYear() === thisYear; })
    .reduce((s, e) => s + Number(e.amount), 0);

  const cashFlowData = MONTHS.map((name, i) => {
    const rev = invoices
      .filter((inv) => { const d = new Date(inv.created_at); return d.getMonth() === i && d.getFullYear() === thisYear && inv.status === 'paid'; })
      .reduce((s, inv) => s + Number(inv.total), 0);
    const exp = expenses
      .filter((e) => { const d = new Date(e.expense_date); return d.getMonth() === i && d.getFullYear() === thisYear; })
      .reduce((s, e) => s + Number(e.amount), 0);
    return { name, entrees: rev, sorties: exp, net: rev - exp };
  });

  const filtered = expenses
    .filter((e) => filterCat === 'all' || e.category === filterCat)
    .filter((e) => e.description.toLowerCase().includes(search.toLowerCase()) || e.category.toLowerCase().includes(search.toLowerCase()));

  function exportCSV() {
    const header = 'Date,Categorie,Description,Montant,Tags\n';
    const rows = filtered.map((e) =>
      `${e.expense_date},${e.category},"${e.description}",${e.amount},"${(e.tags || []).join('; ')}"`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `depenses_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tresorerie</h1>
          <p className="text-sm text-slate-500 mt-0.5">Suivi financier et depenses</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            <Download size={16} /> <span className="hidden sm:inline">Export CSV</span>
          </button>
          <button onClick={openNew} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors">
            <Plus size={16} /> <span className="hidden sm:inline">Nouvelle depense</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Revenue total" value={formatCurrency(totalRevenue)} icon={<TrendingUp size={20} className="text-white" />} color="bg-brand-500" />
        <KPICard title="Encaisse" value={formatCurrency(paidRevenue)} icon={<Wallet size={20} className="text-white" />} color="bg-emerald-500" />
        <KPICard title="Depenses totales" value={formatCurrency(totalExpenses)} icon={<TrendingDown size={20} className="text-white" />} color="bg-red-500" />
        <KPICard title="Depenses du mois" value={formatCurrency(monthExpenses)} icon={<DollarSign size={20} className="text-white" />} color="bg-amber-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Flux de tresorerie ({thisYear})</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cashFlowData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }} formatter={(v: number | undefined) => formatCurrency(v ?? 0)} />
                <Bar dataKey="entrees" fill="#06c6a9" radius={[4, 4, 0, 0]} name="Entrees" />
                <Bar dataKey="sorties" fill="#ef4444" radius={[4, 4, 0, 0]} name="Sorties" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Resultat net mensuel</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={cashFlowData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }} formatter={(v: number | undefined) => formatCurrency(v ?? 0)} />
                <Line type="monotone" dataKey="net" stroke="#06c6a9" strokeWidth={2.5} dot={{ r: 4, fill: '#06c6a9' }} name="Resultat net" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher une depense..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
        </div>
        <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500">
          <option value="all">Toutes categories</option>
          {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<DollarSign size={32} />} title="Aucune depense" description="Enregistrez vos depenses pour un suivi precis"
          action={<button onClick={openNew} className="px-4 py-2 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700">Ajouter</button>} />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Categorie</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Tags</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Montant</th>
                  <th className="w-20"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((exp) => (
                  <tr key={exp.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3 text-sm text-slate-600">{formatDate(exp.expense_date)}</td>
                    <td className="px-5 py-3"><span className="px-2 py-0.5 rounded-full bg-slate-100 text-xs font-medium text-slate-700">{exp.category}</span></td>
                    <td className="px-5 py-3 text-sm text-slate-800">{exp.description}</td>
                    <td className="px-5 py-3 hidden md:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {(exp.tags || []).map((tag, i) => (
                          <span key={i} className="px-1.5 py-0.5 rounded bg-brand-50 text-[10px] font-medium text-brand-700">{tag}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right text-sm font-semibold text-red-600">{formatCurrency(Number(exp.amount))}</td>
                    <td className="px-5 py-3">
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => openEdit(exp)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"><Edit2 size={14} /></button>
                        <button onClick={() => handleDelete(exp.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Modifier la depense' : 'Nouvelle depense'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Categorie</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500">
              {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <input type="text" required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Montant (DT)</label>
              <input type="number" step="0.001" required value={form.amount} onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
              <input type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tags (separes par des virgules)</label>
            <input type="text" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder="Ex: urgent, mensuel, bureau"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 resize-none" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">Annuler</button>
            <button type="submit" className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors">{editing ? 'Enregistrer' : 'Ajouter'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
