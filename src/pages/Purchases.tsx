import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Plus, Search, Trash2, ArrowLeft, Download, Printer } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatCurrency, formatDate, generatePONumber, calculateRetenue, cn, exportTEJCSV, exportTEJXML, downloadFile } from '../lib/utils';
import StatusBadge from '../components/ui/StatusBadge';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import type { PurchaseOrder, Supplier } from '../types';

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  tva_rate: number;
}

export default function Purchases() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterTag, setFilterTag] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [detailOrder, setDetailOrder] = useState<PurchaseOrder | null>(null);
  const [supplierId, setSupplierId] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [formTags, setFormTags] = useState('');
  const [items, setItems] = useState<LineItem[]>([
    { id: crypto.randomUUID(), description: '', quantity: 1, unit_price: 0, tva_rate: 19 },
  ]);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [oRes, sRes] = await Promise.all([
      supabase.from('purchase_orders').select('*, suppliers(name, tax_id), purchase_order_items(*)').order('created_at', { ascending: false }),
      supabase.from('suppliers').select('*').order('name'),
    ]);
    setOrders(oRes.data || []);
    setSuppliers(sRes.data || []);
    setLoading(false);
  }

  function openNew() {
    setSupplierId('');
    setOrderDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setFormTags('');
    setItems([{ id: crypto.randomUUID(), description: '', quantity: 1, unit_price: 0, tva_rate: 19 }]);
    setFormOpen(true);
  }

  function addItem() {
    setItems([...items, { id: crypto.randomUUID(), description: '', quantity: 1, unit_price: 0, tva_rate: 19 }]);
  }

  function removeItem(id: string) {
    if (items.length <= 1) return;
    setItems(items.filter((it) => it.id !== id));
  }

  function updateItem(id: string, field: keyof LineItem, value: string | number) {
    setItems(items.map((it) => it.id === id ? { ...it, [field]: value } : it));
  }

  const subtotal = items.reduce((s, it) => s + it.quantity * it.unit_price, 0);
  const tvaAmount = items.reduce((s, it) => s + it.quantity * it.unit_price * (it.tva_rate / 100), 0);
  const total = subtotal + tvaAmount;
  const retenue = calculateRetenue(total);
  const netToPay = total - retenue;

  async function handleSave() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: po } = await supabase.from('purchase_orders').insert({
      user_id: user.id,
      supplier_id: supplierId || null,
      po_number: generatePONumber(),
      status: 'draft',
      order_date: orderDate,
      subtotal, tva_amount: tvaAmount, total, retenue_source: retenue, net_to_pay: netToPay, notes,
      tags: formTags.split(',').map((t) => t.trim()).filter(Boolean),
    }).select().maybeSingle();

    if (po) {
      await supabase.from('purchase_order_items').insert(
        items.map((it) => ({
          purchase_order_id: po.id,
          description: it.description,
          quantity: it.quantity,
          unit_price: it.unit_price,
          tva_rate: it.tva_rate,
          total: it.quantity * it.unit_price * (1 + it.tva_rate / 100),
        }))
      );
    }
    setFormOpen(false);
    loadData();
  }

  async function updateStatus(id: string, status: PurchaseOrder['status']) {
    await supabase.from('purchase_orders').update({ status }).eq('id', id);
    setDetailOrder(null);
    loadData();
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer ce bon de commande ?')) return;
    await supabase.from('purchase_orders').delete().eq('id', id);
    loadData();
  }

  const allTags = Array.from(new Set(orders.flatMap((o) => o.tags || [])));

  const filtered = orders
    .filter((o) => filterStatus === 'all' || o.status === filterStatus)
    .filter((o) => !filterTag || (o.tags || []).includes(filterTag))
    .filter((o) => o.po_number.toLowerCase().includes(search.toLowerCase()) || (o.suppliers?.name || '').toLowerCase().includes(search.toLowerCase()));

  const statuses = [
    { value: 'all', label: 'Tous' },
    { value: 'draft', label: 'Brouillon' },
    { value: 'ordered', label: 'Commande' },
    { value: 'received', label: 'Recu' },
    { value: 'cancelled', label: 'Annule' },
  ];

  function handleTEJCSV() {
    const data = filtered.map((po) => ({
      po_number: po.po_number,
      order_date: po.order_date,
      supplier_name: po.suppliers?.name || '',
      supplier_tax_id: (po.suppliers as Supplier & { tax_id?: string })?.tax_id || '',
      total: Number(po.total),
      retenue_source: Number(po.retenue_source),
    }));
    downloadFile(exportTEJCSV(data), `tej_export_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
  }

  function handleTEJXML() {
    const data = filtered.map((po) => ({
      po_number: po.po_number,
      order_date: po.order_date,
      supplier_name: po.suppliers?.name || '',
      supplier_tax_id: (po.suppliers as Supplier & { tax_id?: string })?.tax_id || '',
      total: Number(po.total),
      retenue_source: Number(po.retenue_source),
    }));
    downloadFile(exportTEJXML(data), `tej_export_${new Date().toISOString().split('T')[0]}.xml`, 'application/xml');
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (formOpen) {
    return (
      <div className="space-y-6 animate-fade-in max-w-4xl">
        <div className="flex items-center gap-3">
          <button onClick={() => setFormOpen(false)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"><ArrowLeft size={20} /></button>
          <h1 className="text-2xl font-bold text-slate-900">Nouveau bon de commande</h1>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fournisseur</label>
              <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500">
                <option value="">Selectionner</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
              <input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tags (virgules)</label>
              <input type="text" value={formTags} onChange={(e) => setFormTags(e.target.value)} placeholder="Ex: urgent, bureau"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-900">Articles</h3>
              <button onClick={addItem} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-brand-600 hover:bg-brand-50">
                <Plus size={14} /> Ajouter
              </button>
            </div>
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.id} className="grid grid-cols-12 gap-2 items-end p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="col-span-12 sm:col-span-4">
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">Description</label>
                    <input type="text" value={item.description} onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                      className="w-full px-2 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500/20" />
                  </div>
                  <div className="col-span-3 sm:col-span-2">
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">Qte</label>
                    <input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500/20" />
                  </div>
                  <div className="col-span-4 sm:col-span-2">
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">Prix HT</label>
                    <input type="number" step="0.001" value={item.unit_price} onChange={(e) => updateItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500/20" />
                  </div>
                  <div className="col-span-3 sm:col-span-2">
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">TVA%</label>
                    <input type="number" value={item.tva_rate} onChange={(e) => updateItem(item.id, 'tva_rate', parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500/20" />
                  </div>
                  <div className="col-span-2 sm:col-span-2 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">{formatCurrency(item.quantity * item.unit_price)}</span>
                    <button onClick={() => removeItem(item.id)} disabled={items.length <= 1}
                      className="p-1 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 disabled:opacity-30"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="max-w-xs ml-auto bg-slate-50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm"><span className="text-slate-500">Sous-total HT</span><span className="font-medium">{formatCurrency(subtotal)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-500">TVA</span><span className="font-medium">{formatCurrency(tvaAmount)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-500">Total TTC</span><span className="font-bold">{formatCurrency(total)}</span></div>
            {retenue > 0 && (
              <div className="flex justify-between text-sm text-amber-700"><span>Retenue source (1%)</span><span className="font-medium">-{formatCurrency(retenue)}</span></div>
            )}
            <div className="flex justify-between text-base pt-2 border-t border-slate-200">
              <span className="font-semibold text-slate-900">Net a payer</span>
              <span className="font-bold text-slate-900">{formatCurrency(netToPay)}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 resize-none" />
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <button onClick={() => setFormOpen(false)} className="px-6 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">Annuler</button>
          <button onClick={handleSave} className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors">Enregistrer</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Bons de commande</h1>
          <p className="text-sm text-slate-500 mt-0.5">{orders.length} commandes</p>
        </div>
        <div className="flex gap-2">
          <div className="relative group">
            <button className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
              <Download size={16} /> TEJ
            </button>
            <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg py-1 w-40 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <button onClick={handleTEJCSV} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Export CSV</button>
              <button onClick={handleTEJXML} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Export XML</button>
            </div>
          </div>
          <button onClick={openNew} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors">
            <Plus size={16} /><span className="hidden sm:inline">Nouvelle commande</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher..."
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
        {allTags.length > 0 && (
          <select value={filterTag} onChange={(e) => setFilterTag(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500">
            <option value="">Tous les tags</option>
            {allTags.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<ShoppingCart size={32} />} title="Aucun bon de commande" description="Creez votre premier bon de commande"
          action={<button onClick={openNew} className="px-4 py-2 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700">Creer</button>} />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">N&deg;</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Fournisseur</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Date</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Tags</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Statut</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Net a payer</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-24"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((po) => (
                  <tr key={po.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => setDetailOrder(po)}>
                    <td className="px-5 py-3.5 text-sm font-semibold text-slate-900">{po.po_number}</td>
                    <td className="px-5 py-3.5 text-sm text-slate-700">{po.suppliers?.name || '-'}</td>
                    <td className="px-5 py-3.5 text-sm text-slate-500 hidden sm:table-cell">{formatDate(po.order_date)}</td>
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {(po.tags || []).map((tag, i) => (
                          <span key={i} className="px-1.5 py-0.5 rounded bg-brand-50 text-[10px] font-medium text-brand-700">{tag}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-3.5"><StatusBadge status={po.status} /></td>
                    <td className="px-5 py-3.5 text-right text-sm font-semibold text-slate-900">{formatCurrency(Number(po.net_to_pay))}</td>
                    <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => navigate(`/print/purchase/${po.id}`)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"><Printer size={14} /></button>
                        <button onClick={() => handleDelete(po.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={!!detailOrder} onClose={() => setDetailOrder(null)} title={detailOrder?.po_number || ''} size="lg">
        {detailOrder && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <StatusBadge status={detailOrder.status} />
              <span className="text-sm text-slate-500">{detailOrder.suppliers?.name}</span>
              {(detailOrder.tags || []).map((tag, i) => (
                <span key={i} className="px-2 py-0.5 rounded-full bg-brand-50 text-xs font-medium text-brand-700">{tag}</span>
              ))}
            </div>
            {detailOrder.purchase_order_items && detailOrder.purchase_order_items.length > 0 && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-2 text-xs font-semibold text-slate-500">Description</th>
                    <th className="text-right py-2 text-xs font-semibold text-slate-500">Qte</th>
                    <th className="text-right py-2 text-xs font-semibold text-slate-500">Prix</th>
                    <th className="text-right py-2 text-xs font-semibold text-slate-500">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {detailOrder.purchase_order_items.map((item) => (
                    <tr key={item.id} className="border-b border-slate-50">
                      <td className="py-2 text-slate-800">{item.description}</td>
                      <td className="py-2 text-right text-slate-600">{item.quantity}</td>
                      <td className="py-2 text-right text-slate-600">{formatCurrency(Number(item.unit_price))}</td>
                      <td className="py-2 text-right font-medium">{formatCurrency(Number(item.total))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="space-y-1 text-sm max-w-xs ml-auto">
              <div className="flex justify-between"><span className="text-slate-500">Total TTC</span><span className="font-medium">{formatCurrency(Number(detailOrder.total))}</span></div>
              {Number(detailOrder.retenue_source) > 0 && (
                <div className="flex justify-between text-amber-700"><span>Retenue source</span><span>-{formatCurrency(Number(detailOrder.retenue_source))}</span></div>
              )}
              <div className="flex justify-between font-bold pt-1 border-t border-slate-100"><span>Net a payer</span><span>{formatCurrency(Number(detailOrder.net_to_pay))}</span></div>
            </div>
            <div className="flex gap-2 pt-2 flex-wrap">
              {detailOrder.status === 'draft' && (
                <button onClick={() => updateStatus(detailOrder.id, 'ordered')} className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">Marquer commande</button>
              )}
              {detailOrder.status === 'ordered' && (
                <button onClick={() => updateStatus(detailOrder.id, 'received')} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700">Marquer recu</button>
              )}
              {detailOrder.status !== 'cancelled' && detailOrder.status !== 'received' && (
                <button onClick={() => updateStatus(detailOrder.id, 'cancelled')} className="px-4 py-2 rounded-xl border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50">Annuler</button>
              )}
              <button onClick={() => navigate(`/print/purchase/${detailOrder.id}`)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 flex items-center gap-1.5">
                <Printer size={14} /> Imprimer
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
