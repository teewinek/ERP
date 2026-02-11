import { useEffect, useState } from 'react';
import { Users, Plus, Search, Edit2, Trash2, Building2, User, Phone, Mail } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatDate, cn } from '../lib/utils';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import type { Client } from '../types';

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'b2b' | 'b2c'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState({
    name: '', type: 'b2c' as 'b2b' | 'b2c', email: '', phone: '', address: '', city: '', tax_id: '', notes: '',
  });

  useEffect(() => { loadClients(); }, []);

  async function loadClients() {
    const { data } = await supabase.from('clients').select('*').order('created_at', { ascending: false });
    setClients(data || []);
    setLoading(false);
  }

  function openNew() {
    setEditing(null);
    setForm({ name: '', type: 'b2c', email: '', phone: '', address: '', city: '', tax_id: '', notes: '' });
    setModalOpen(true);
  }

  function openEdit(client: Client) {
    setEditing(client);
    setForm({
      name: client.name, type: client.type, email: client.email, phone: client.phone,
      address: client.address, city: client.city, tax_id: client.tax_id, notes: client.notes,
    });
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (editing) {
      await supabase.from('clients').update(form).eq('id', editing.id);
    } else {
      await supabase.from('clients').insert({ ...form, user_id: user.id });
    }
    setModalOpen(false);
    loadClients();
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer ce client ?')) return;
    await supabase.from('clients').delete().eq('id', id);
    loadClients();
  }

  const filtered = clients
    .filter((c) => filterType === 'all' || c.type === filterType)
    .filter((c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase()));

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clients</h1>
          <p className="text-sm text-slate-500 mt-0.5">{clients.length} clients enregistres</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors">
          <Plus size={16} />
          <span className="hidden sm:inline">Nouveau client</span>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un client..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
          />
        </div>
        <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1">
          {(['all', 'b2b', 'b2c'] as const).map((type) => (
            <button
              key={type} onClick={() => setFilterType(type)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                filterType === type ? 'bg-brand-500 text-white' : 'text-slate-600 hover:bg-slate-50'
              )}
            >
              {type === 'all' ? 'Tous' : type.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Users size={32} />}
          title="Aucun client"
          description="Commencez par ajouter votre premier client"
          action={<button onClick={openNew} className="px-4 py-2 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors">Ajouter un client</button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((client) => (
            <div key={client.id} className="bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-md transition-all duration-200 group">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center',
                    client.type === 'b2b' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
                  )}>
                    {client.type === 'b2b' ? <Building2 size={18} /> : <User size={18} />}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">{client.name}</h3>
                    <span className={cn(
                      'text-[10px] font-bold uppercase tracking-wider',
                      client.type === 'b2b' ? 'text-blue-500' : 'text-emerald-500'
                    )}>{client.type}</span>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(client)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"><Edit2 size={14} /></button>
                  <button onClick={() => handleDelete(client.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500"><Trash2 size={14} /></button>
                </div>
              </div>
              <div className="space-y-1.5 text-xs text-slate-500">
                {client.email && <div className="flex items-center gap-2"><Mail size={13} />{client.email}</div>}
                {client.phone && <div className="flex items-center gap-2"><Phone size={13} />{client.phone}</div>}
                {client.city && <div className="flex items-center gap-2"><span className="text-slate-400">Ville:</span>{client.city}</div>}
              </div>
              <div className="mt-3 pt-3 border-t border-slate-50 text-[11px] text-slate-400">
                Ajoute le {formatDate(client.created_at)}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Modifier le client' : 'Nouveau client'} size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Nom</label>
              <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as 'b2b' | 'b2c' })}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white">
                <option value="b2c">B2C - Particulier</option>
                <option value="b2b">B2B - Entreprise</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Telephone</label>
              <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Ville</label>
              <input type="text" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Adresse</label>
              <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Matricule Fiscale</label>
              <input type="text" value={form.tax_id} onChange={(e) => setForm({ ...form, tax_id: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 resize-none" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">Annuler</button>
            <button type="submit" className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors">
              {editing ? 'Enregistrer' : 'Ajouter'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
