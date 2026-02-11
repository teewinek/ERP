import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, Plus, Search, Eye, Trash2, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatDate, cn } from '../lib/utils';
import StatusBadge from '../components/ui/StatusBadge';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import type { DeliveryNote, Client } from '../types';

interface InvoiceRef {
  id: string;
  invoice_number: string;
  client_id: string;
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon', delivered: 'Livre', returned: 'Retourne',
};

interface BLLineItem {
  id: string;
  description: string;
  quantity: number;
}

export default function DeliveryNotes() {
  const [notes, setNotes] = useState<DeliveryNote[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [detailNote, setDetailNote] = useState<DeliveryNote | null>(null);
  const [clientId, setClientId] = useState('');
  const [invoiceId, setInvoiceId] = useState('');
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0]);
  const [address, setAddress] = useState('');
  const [noteText, setNoteText] = useState('');
  const [items, setItems] = useState<BLLineItem[]>([
    { id: crypto.randomUUID(), description: '', quantity: 1 },
  ]);
  const navigate = useNavigate();

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [nRes, cRes, iRes] = await Promise.all([
      supabase.from('delivery_notes').select('*, clients(name), delivery_note_items(*)').order('created_at', { ascending: false }),
      supabase.from('clients').select('*').order('name'),
      supabase.from('invoices').select('id, invoice_number, client_id').eq('status', 'validated').order('created_at', { ascending: false }),
    ]);
    setNotes(nRes.data || []);
    setClients(cRes.data || []);
    setInvoices(iRes.data || []);
    setLoading(false);
  }

  function openNew() {
    setClientId('');
    setInvoiceId('');
    setDeliveryDate(new Date().toISOString().split('T')[0]);
    setAddress('');
    setNoteText('');
    setItems([{ id: crypto.randomUUID(), description: '', quantity: 1 }]);
    setFormOpen(true);
  }

  function addItem() { setItems([...items, { id: crypto.randomUUID(), description: '', quantity: 1 }]); }
  function removeItem(id: string) { if (items.length <= 1) return; setItems(items.filter((it) => it.id !== id)); }

  async function handleSave() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: settings } = await supabase.from('company_settings').select('*').eq('user_id', user.id).maybeSingle();
    const prefix = settings?.dn_prefix || 'BL';
    const seq = settings?.next_dn_seq || 1;
    const dnNumber = `${prefix}-${String(seq).padStart(5, '0')}`;

    const { data: dn } = await supabase.from('delivery_notes').insert({
      user_id: user.id,
      client_id: clientId || null,
      invoice_id: invoiceId || null,
      dn_number: dnNumber,
      status: 'draft',
      delivery_date: deliveryDate,
      address,
      notes: noteText,
    }).select().maybeSingle();
    if (!dn) return;
    await supabase.from('delivery_note_items').insert(
      items.map((it) => ({ delivery_note_id: dn.id, description: it.description, quantity: it.quantity }))
    );

    if (settings) {
      await supabase.from('company_settings').update({ next_dn_seq: seq + 1 }).eq('id', settings.id);
    }

    setFormOpen(false);
    loadData();
  }

  async function updateStatus(id: string, status: DeliveryNote['status']) {
    await supabase.from('delivery_notes').update({ status }).eq('id', id);
    setDetailNote(null);
    loadData();
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer ce bon de livraison ?')) return;
    await supabase.from('delivery_notes').delete().eq('id', id);
    loadData();
  }

  const filtered = notes
    .filter((n) => filterStatus === 'all' || n.status === filterStatus)
    .filter((n) => n.dn_number.toLowerCase().includes(search.toLowerCase()) || (n.clients?.name || '').toLowerCase().includes(search.toLowerCase()));

  const statuses = [
    { value: 'all', label: 'Tous' },
    { value: 'draft', label: 'Brouillon' },
    { value: 'delivered', label: 'Livre' },
    { value: 'returned', label: 'Retourne' },
  ];

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (formOpen) {
    return (
      <div className="space-y-6 animate-fade-in max-w-4xl">
        <div className="flex items-center gap-3">
          <button onClick={() => setFormOpen(false)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"><ArrowLeft size={20} /></button>
          <h1 className="text-2xl font-bold text-slate-900">Nouveau bon de livraison</h1>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Client</label>
              <select value={clientId} onChange={(e) => setClientId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500">
                <option value="">Selectionner</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Facture liee</label>
              <select value={invoiceId} onChange={(e) => setInvoiceId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500">
                <option value="">Aucune</option>
                {invoices.map((inv) => <option key={inv.id} value={inv.id}>{inv.invoice_number}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date de livraison</label>
              <input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Adresse de livraison</label>
              <input type="text" value={address} onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-900">Articles</h3>
              <button onClick={addItem} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-brand-600 hover:bg-brand-50"><Plus size={14} /> Ajouter</button>
            </div>
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.id} className="flex gap-3 items-end p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex-1">
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">Description</label>
                    <input type="text" value={item.description} onChange={(e) => setItems(items.map((it) => it.id === item.id ? { ...it, description: e.target.value } : it))}
                      className="w-full px-2 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500/20" />
                  </div>
                  <div className="w-24">
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">Qte</label>
                    <input type="number" min="1" value={item.quantity} onChange={(e) => setItems(items.map((it) => it.id === item.id ? { ...it, quantity: parseFloat(e.target.value) || 1 } : it))}
                      className="w-full px-2 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500/20" />
                  </div>
                  <button onClick={() => removeItem(item.id)} disabled={items.length <= 1}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 disabled:opacity-30 mb-0.5"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} rows={2}
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
          <h1 className="text-2xl font-bold text-slate-900">Bons de livraison</h1>
          <p className="text-sm text-slate-500 mt-0.5">{notes.length} bons</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors">
          <Plus size={16} /><span className="hidden sm:inline">Nouveau BL</span>
        </button>
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
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Truck size={32} />} title="Aucun bon de livraison" description="Creez votre premier BL"
          action={<button onClick={openNew} className="px-4 py-2 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700">Creer</button>} />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">N&deg;</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Client</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Date</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Statut</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-24"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((dn) => (
                  <tr key={dn.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => setDetailNote(dn)}>
                    <td className="px-5 py-3.5 text-sm font-semibold text-slate-900">{dn.dn_number}</td>
                    <td className="px-5 py-3.5 text-sm text-slate-700">{dn.clients?.name || '-'}</td>
                    <td className="px-5 py-3.5 text-sm text-slate-500 hidden sm:table-cell">{formatDate(dn.delivery_date)}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={dn.status} label={STATUS_LABELS[dn.status]} /></td>
                    <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setDetailNote(dn)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"><Eye size={14} /></button>
                        <button onClick={() => handleDelete(dn.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={!!detailNote} onClose={() => setDetailNote(null)} title={detailNote?.dn_number || ''} size="lg">
        {detailNote && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <StatusBadge status={detailNote.status} label={STATUS_LABELS[detailNote.status]} />
              <span className="text-sm text-slate-500">{detailNote.clients?.name}</span>
              <span className="text-sm text-slate-400">{formatDate(detailNote.delivery_date)}</span>
            </div>
            {detailNote.address && <p className="text-sm text-slate-600">Adresse: {detailNote.address}</p>}
            {detailNote.delivery_note_items && detailNote.delivery_note_items.length > 0 && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-2 text-xs font-semibold text-slate-500">Description</th>
                    <th className="text-right py-2 text-xs font-semibold text-slate-500">Qte</th>
                  </tr>
                </thead>
                <tbody>
                  {detailNote.delivery_note_items.map((item) => (
                    <tr key={item.id} className="border-b border-slate-50">
                      <td className="py-2 text-slate-800">{item.description}</td>
                      <td className="py-2 text-right text-slate-600">{item.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {detailNote.notes && <p className="text-sm text-slate-500 p-3 rounded-lg bg-slate-50">{detailNote.notes}</p>}
            <div className="flex gap-2 pt-2">
              {detailNote.status === 'draft' && (
                <button onClick={() => updateStatus(detailNote.id, 'delivered')} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700">Marquer livre</button>
              )}
              {detailNote.status === 'delivered' && (
                <button onClick={() => updateStatus(detailNote.id, 'returned')} className="px-4 py-2 rounded-xl border border-orange-200 text-orange-600 text-sm font-medium hover:bg-orange-50">Marquer retourne</button>
              )}
              <button onClick={() => { navigate(`/print/bl/${detailNote.id}`); }} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50">Imprimer</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
