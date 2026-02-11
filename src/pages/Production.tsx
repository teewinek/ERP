import { useEffect, useState } from 'react';
import { Factory, Plus, Search, Edit2, Trash2, Clock, Zap, LayoutGrid, Columns3 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatDate, cn, TECHNIQUE_LABELS, generateJobNumber } from '../lib/utils';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import StatusBadge from '../components/ui/StatusBadge';
import type { ProductionJob, Client } from '../types';

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  in_progress: 'En cours',
  completed: 'Termine',
  delivered: 'Livre',
};

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Basse',
  medium: 'Moyenne',
  high: 'Haute',
  urgent: 'Urgente',
};

const KANBAN_COLUMNS: { key: ProductionJob['status']; label: string; color: string; headerBg: string }[] = [
  { key: 'pending', label: 'En attente', color: 'border-amber-200', headerBg: 'bg-amber-50 text-amber-800' },
  { key: 'in_progress', label: 'En cours', color: 'border-blue-200', headerBg: 'bg-blue-50 text-blue-800' },
  { key: 'completed', label: 'Termine', color: 'border-emerald-200', headerBg: 'bg-emerald-50 text-emerald-800' },
  { key: 'delivered', label: 'Livre', color: 'border-teal-200', headerBg: 'bg-teal-50 text-teal-800' },
];

export default function Production() {
  const [jobs, setJobs] = useState<ProductionJob[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTechnique, setFilterTechnique] = useState('all');
  const [viewMode, setViewMode] = useState<'cards' | 'kanban'>('kanban');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ProductionJob | null>(null);
  const [form, setForm] = useState({
    title: '', technique: 'dtf' as ProductionJob['technique'], client_id: '',
    priority: 'medium' as ProductionJob['priority'], quantity: 1, deadline: '', notes: '',
  });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [jRes, cRes] = await Promise.all([
      supabase.from('production_jobs').select('*, clients(name)').order('created_at', { ascending: false }),
      supabase.from('clients').select('*').order('name'),
    ]);
    setJobs(jRes.data || []);
    setClients(cRes.data || []);
    setLoading(false);
  }

  function openNew() {
    setEditing(null);
    setForm({ title: '', technique: 'dtf', client_id: '', priority: 'medium', quantity: 1, deadline: '', notes: '' });
    setModalOpen(true);
  }

  function openEdit(job: ProductionJob) {
    setEditing(job);
    setForm({
      title: job.title, technique: job.technique, client_id: job.client_id || '',
      priority: job.priority, quantity: job.quantity, deadline: job.deadline || '', notes: job.notes,
    });
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const payload = {
      title: form.title, technique: form.technique, client_id: form.client_id || null,
      priority: form.priority, quantity: form.quantity, deadline: form.deadline || null, notes: form.notes,
      updated_at: new Date().toISOString(),
    };
    if (editing) {
      await supabase.from('production_jobs').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('production_jobs').insert({ ...payload, user_id: user.id, job_number: generateJobNumber(), status: 'pending' });
    }
    setModalOpen(false);
    loadData();
  }

  async function updateStatus(id: string, status: ProductionJob['status']) {
    await supabase.from('production_jobs').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    loadData();
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer ce travail ?')) return;
    await supabase.from('production_jobs').delete().eq('id', id);
    loadData();
  }

  const filtered = jobs
    .filter((j) => filterTechnique === 'all' || j.technique === filterTechnique)
    .filter((j) => j.title.toLowerCase().includes(search.toLowerCase()) || j.job_number.toLowerCase().includes(search.toLowerCase()));

  const techniques = [
    { value: 'all', label: 'Toutes' },
    { value: 'dtf', label: 'DTF' },
    { value: 'uv', label: 'UV' },
    { value: 'embroidery', label: 'Broderie' },
    { value: 'laser', label: 'Laser' },
  ];

  const techColors: Record<string, string> = {
    dtf: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    uv: 'bg-amber-50 text-amber-700 border-amber-200',
    embroidery: 'bg-rose-50 text-rose-700 border-rose-200',
    laser: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };

  const priorityColors: Record<string, string> = {
    low: 'text-slate-500',
    medium: 'text-blue-600',
    high: 'text-orange-600',
    urgent: 'text-red-600',
  };

  const pendingCount = jobs.filter((j) => j.status === 'pending').length;
  const activeCount = jobs.filter((j) => j.status === 'in_progress').length;
  const completedCount = jobs.filter((j) => j.status === 'completed' || j.status === 'delivered').length;

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  function renderJobCard(job: ProductionJob, compact = false) {
    return (
      <div key={job.id} className={cn('bg-white rounded-xl border border-slate-100 p-4 hover:shadow-md transition-all duration-200 group', compact && 'p-3')}>
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={cn('px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase border', techColors[job.technique])}>
              {TECHNIQUE_LABELS[job.technique]}
            </span>
            {!compact && <StatusBadge status={job.status} label={STATUS_LABELS[job.status]} />}
          </div>
          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => openEdit(job)} className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600"><Edit2 size={12} /></button>
            <button onClick={() => handleDelete(job.id)} className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500"><Trash2 size={12} /></button>
          </div>
        </div>
        <h3 className={cn('font-semibold text-slate-900 mb-0.5', compact ? 'text-xs' : 'text-sm')}>{job.title}</h3>
        <p className="text-[11px] text-slate-500 mb-2">{job.job_number}</p>
        <div className="space-y-1 text-[11px] text-slate-500">
          {job.clients?.name && <p>Client: <span className="text-slate-700 font-medium">{job.clients.name}</span></p>}
          <p>Qte: <span className="text-slate-700 font-medium">{job.quantity}</span></p>
          <p className={priorityColors[job.priority]}>{PRIORITY_LABELS[job.priority]}</p>
          {job.deadline && <p>Deadline: <span className="text-slate-700 font-medium">{formatDate(job.deadline)}</span></p>}
        </div>
        <div className="flex gap-1.5 mt-3 pt-2 border-t border-slate-50">
          {job.status === 'pending' && (
            <button onClick={() => updateStatus(job.id, 'in_progress')} className="flex-1 py-1.5 rounded-lg text-[11px] font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors">Demarrer</button>
          )}
          {job.status === 'in_progress' && (
            <button onClick={() => updateStatus(job.id, 'completed')} className="flex-1 py-1.5 rounded-lg text-[11px] font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors">Terminer</button>
          )}
          {job.status === 'completed' && (
            <button onClick={() => updateStatus(job.id, 'delivered')} className="flex-1 py-1.5 rounded-lg text-[11px] font-medium bg-teal-50 text-teal-700 hover:bg-teal-100 transition-colors">Livre</button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Production</h1>
          <p className="text-sm text-slate-500 mt-0.5">{jobs.length} travaux</p>
        </div>
        <div className="flex gap-2">
          <div className="flex gap-0.5 bg-white border border-slate-200 rounded-xl p-0.5">
            <button onClick={() => setViewMode('kanban')}
              className={cn('p-2 rounded-lg transition-colors', viewMode === 'kanban' ? 'bg-brand-500 text-white' : 'text-slate-500 hover:bg-slate-50')}>
              <Columns3 size={16} />
            </button>
            <button onClick={() => setViewMode('cards')}
              className={cn('p-2 rounded-lg transition-colors', viewMode === 'cards' ? 'bg-brand-500 text-white' : 'text-slate-500 hover:bg-slate-50')}>
              <LayoutGrid size={16} />
            </button>
          </div>
          <button onClick={openNew} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors">
            <Plus size={16} /><span className="hidden sm:inline">Nouveau travail</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-amber-50 rounded-2xl border border-amber-100 p-4 text-center">
          <Clock size={20} className="text-amber-600 mx-auto mb-1" />
          <p className="text-2xl font-bold text-amber-800">{pendingCount}</p>
          <p className="text-xs text-amber-600">En attente</p>
        </div>
        <div className="bg-blue-50 rounded-2xl border border-blue-100 p-4 text-center">
          <Zap size={20} className="text-blue-600 mx-auto mb-1" />
          <p className="text-2xl font-bold text-blue-800">{activeCount}</p>
          <p className="text-xs text-blue-600">En cours</p>
        </div>
        <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-4 text-center">
          <Factory size={20} className="text-emerald-600 mx-auto mb-1" />
          <p className="text-2xl font-bold text-emerald-800">{completedCount}</p>
          <p className="text-xs text-emerald-600">Termines</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
        </div>
        <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 overflow-x-auto">
          {techniques.map((t) => (
            <button key={t.value} onClick={() => setFilterTechnique(t.value)}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap',
                filterTechnique === t.value ? 'bg-brand-500 text-white' : 'text-slate-600 hover:bg-slate-50')}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Factory size={32} />} title="Aucun travail" description="Lancez votre premiere production"
          action={<button onClick={openNew} className="px-4 py-2 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700">Creer</button>} />
      ) : viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {KANBAN_COLUMNS.map((col) => {
            const colJobs = filtered.filter((j) => j.status === col.key);
            return (
              <div key={col.key} className={cn('bg-slate-50/50 rounded-2xl border p-3 min-h-[200px]', col.color)}>
                <div className={cn('flex items-center justify-between mb-3 px-2 py-1.5 rounded-lg', col.headerBg)}>
                  <span className="text-xs font-bold uppercase tracking-wider">{col.label}</span>
                  <span className="text-xs font-bold">{colJobs.length}</span>
                </div>
                <div className="space-y-2">
                  {colJobs.map((job) => renderJobCard(job, true))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((job) => renderJobCard(job))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Modifier le travail' : 'Nouveau travail'} size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Titre</label>
              <input type="text" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ex: T-shirts equipe marketing"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Technique</label>
              <select value={form.technique} onChange={(e) => setForm({ ...form, technique: e.target.value as ProductionJob['technique'] })}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500">
                <option value="dtf">DTF</option>
                <option value="uv">UV</option>
                <option value="embroidery">Broderie</option>
                <option value="laser">Laser</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Client</label>
              <select value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500">
                <option value="">Aucun</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Priorite</label>
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as ProductionJob['priority'] })}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500">
                <option value="low">Basse</option>
                <option value="medium">Moyenne</option>
                <option value="high">Haute</option>
                <option value="urgent">Urgente</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Quantite</label>
              <input type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Deadline</label>
              <input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 resize-none" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">Annuler</button>
            <button type="submit" className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors">{editing ? 'Enregistrer' : 'Creer'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
