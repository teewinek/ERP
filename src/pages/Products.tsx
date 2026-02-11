import { useEffect, useState } from 'react';
import { Package, Plus, Search, Edit2, Trash2, Tag } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatCurrency, cn, TECHNIQUE_LABELS } from '../lib/utils';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import type { Product } from '../types';

const CATEGORIES = [
  { value: 'all', label: 'Tous' },
  { value: 'dtf', label: 'DTF' },
  { value: 'uv', label: 'UV' },
  { value: 'embroidery', label: 'Broderie' },
  { value: 'laser', label: 'Laser' },
  { value: 'other', label: 'Autre' },
];

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({
    name: '', description: '', category: 'dtf' as Product['category'],
    base_price: 0, cost_price: 0, tva_rate: 19, sku: '', is_active: true,
  });

  useEffect(() => { loadProducts(); }, []);

  async function loadProducts() {
    const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    setProducts(data || []);
    setLoading(false);
  }

  function openNew() {
    setEditing(null);
    setForm({ name: '', description: '', category: 'dtf', base_price: 0, cost_price: 0, tva_rate: 19, sku: '', is_active: true });
    setModalOpen(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setForm({
      name: p.name, description: p.description, category: p.category,
      base_price: p.base_price, cost_price: p.cost_price, tva_rate: p.tva_rate, sku: p.sku, is_active: p.is_active,
    });
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (editing) {
      await supabase.from('products').update(form).eq('id', editing.id);
    } else {
      await supabase.from('products').insert({ ...form, user_id: user.id });
    }
    setModalOpen(false);
    loadProducts();
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer ce produit ?')) return;
    await supabase.from('products').delete().eq('id', id);
    loadProducts();
  }

  const filtered = products
    .filter((p) => filterCat === 'all' || p.category === filterCat)
    .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()));

  const catColors: Record<string, string> = {
    dtf: 'bg-cyan-50 text-cyan-700',
    uv: 'bg-amber-50 text-amber-700',
    embroidery: 'bg-rose-50 text-rose-700',
    laser: 'bg-emerald-50 text-emerald-700',
    other: 'bg-slate-100 text-slate-700',
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Produits</h1>
          <p className="text-sm text-slate-500 mt-0.5">{products.length} produits dans le catalogue</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors">
          <Plus size={16} />
          <span className="hidden sm:inline">Nouveau produit</span>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un produit..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
        </div>
        <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 overflow-x-auto">
          {CATEGORIES.map((cat) => (
            <button key={cat.value} onClick={() => setFilterCat(cat.value)}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap',
                filterCat === cat.value ? 'bg-brand-500 text-white' : 'text-slate-600 hover:bg-slate-50')}>
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Package size={32} />} title="Aucun produit" description="Ajoutez vos produits au catalogue"
          action={<button onClick={openNew} className="px-4 py-2 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors">Ajouter un produit</button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((product) => {
            const margin = product.base_price > 0 ? ((product.base_price - product.cost_price) / product.base_price * 100) : 0;
            return (
              <div key={product.id} className="bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-md transition-all duration-200 group">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', catColors[product.category] || catColors.other)}>
                      <Tag size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">{product.name}</h3>
                      <span className={cn('inline-block text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md mt-0.5', catColors[product.category] || catColors.other)}>
                        {TECHNIQUE_LABELS[product.category] || product.category}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(product)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"><Edit2 size={14} /></button>
                    <button onClick={() => handleDelete(product.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500"><Trash2 size={14} /></button>
                  </div>
                </div>
                {product.description && <p className="text-xs text-slate-500 mb-3 line-clamp-2">{product.description}</p>}
                <div className="flex items-end justify-between pt-3 border-t border-slate-50">
                  <div>
                    <p className="text-lg font-bold text-slate-900">{formatCurrency(product.base_price)}</p>
                    <p className="text-xs text-slate-400">Cout: {formatCurrency(product.cost_price)}</p>
                  </div>
                  <div className={cn('text-xs font-semibold px-2 py-1 rounded-lg', margin >= 30 ? 'bg-emerald-50 text-emerald-700' : margin >= 15 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700')}>
                    Marge {margin.toFixed(0)}%
                  </div>
                </div>
                {product.sku && <p className="text-[11px] text-slate-400 mt-2">SKU: {product.sku}</p>}
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Modifier le produit' : 'Nouveau produit'} size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Nom du produit</label>
              <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Categorie</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as Product['category'] })}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500">
                <option value="dtf">DTF</option>
                <option value="uv">UV</option>
                <option value="embroidery">Broderie</option>
                <option value="laser">Laser</option>
                <option value="other">Autre</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">SKU</label>
              <input type="text" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Prix de vente HT (DT)</label>
              <input type="number" step="0.001" required value={form.base_price} onChange={(e) => setForm({ ...form, base_price: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Prix de revient (DT)</label>
              <input type="number" step="0.001" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Taux TVA (%)</label>
              <input type="number" step="1" value={form.tva_rate} onChange={(e) => setForm({ ...form, tva_rate: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 resize-none" />
            </div>
            <div className="sm:col-span-2 flex items-center gap-2">
              <input type="checkbox" id="active" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
              <label htmlFor="active" className="text-sm text-slate-700">Produit actif</label>
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
