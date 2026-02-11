import { useEffect, useState } from 'react';
import { Truck, Plus, Search, Edit2, Trash2, Phone, Mail, MapPin } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import type { Supplier } from '../types';

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState({
    name: '', contact_name: '', email: '', phone: '', address: '', city: '', tax_id: '', category: '', notes: '',
  });

  useEffect(() => { loadSuppliers(); }, []);

  async function loadSuppliers() {
    const { data } = await supabase.from('suppliers').select('*').order('created_at', { ascending: false });
    setSuppliers(data || []);
    setLoading(false);
  }

  function openNew() {
    setEditing(null);
    setForm({ name: '', contact_name: '', email: '', phone: '', address: '', city: '', tax_id: '', category: '', notes: '' });
    setModalOpen(true);
  }

  function openEdit(s: Supplier) {
    setEditing(s);
    setForm({
      name: s.name, contact_name: s.contact_name, email: s.email, phone: s.phone,
      address: s.address, city: s.city, tax_id: s.tax_id, category: s.category, notes: s.notes || '',
    });
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (editing) {
      await supabase.from('suppliers').update(form).eq('id', editing.id);
    } else {
      await supabase.from('suppliers').insert({ ...form, user_id: user.id });
    }
    setModalOpen(false);
    loadSuppliers();
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer ce fournisseur ?')) return;
    await supabase.from('suppliers').delete().eq('id', id);
    loadSuppliers();
  }

  const filtered = suppliers.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) || s.category.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Fournisseurs</h1>
          <p className="text-sm text-slate-500 mt-0.5">{suppliers.length} fournisseurs</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors">
          <Plus size={16} /><span className="hidden sm:inline">Nouveau fournisseur</span>
        </button>
      </div>

      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Truck size={32} />} title="Aucun fournisseur" description="Ajoutez vos fournisseurs pour suivre vos achats"
          action={<button onClick={openNew} className="px-4 py-2 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700">Ajouter</button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((supplier) => (
            <div key={supplier.id} className="bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-md transition-all duration-200 group">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
                    <Truck size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">{supplier.name}</h3>
                    {supplier.category && <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">{supplier.category}</span>}
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(supplier)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"><Edit2 size={14} /></button>
                  <button onClick={() => handleDelete(supplier.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500"><Trash2 size={14} /></button>
                </div>
              </div>
              <div className="space-y-1.5 text-xs text-slate-500">
                {supplier.contact_name && <p className="font-medium text-slate-700">{supplier.contact_name}</p>}
                {supplier.email && <div className="flex items-center gap-2"><Mail size={13} />{supplier.email}</div>}
                {supplier.phone && <div className="flex items-center gap-2"><Phone size={13} />{supplier.phone}</div>}
                {supplier.city && <div className="flex items-center gap-2"><MapPin size={13} />{supplier.city}</div>}
                {supplier.tax_id && <p className="text-slate-400">MF: {supplier.tax_id}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Modifier le fournisseur' : 'Nouveau fournisseur'} size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Nom</label>
              <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Contact</label>
              <input type="text" value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Categorie</label>
              <input type="text" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="Ex: Encres, Films, Machines..."
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
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
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">Annuler</button>
            <button type="submit" className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors">{editing ? 'Enregistrer' : 'Ajouter'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
