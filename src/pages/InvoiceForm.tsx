import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../lib/utils';
import type { Client, Product, CompanySettings } from '../types';

interface LineItem {
  id: string;
  product_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  tva_rate: number;
}

export default function InvoiceForm() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [clientId, setClientId] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [notes, setNotes] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [numberError, setNumberError] = useState('');
  const [fodecEnabled, setFodecEnabled] = useState(false);
  const [fodecRate, setFodecRate] = useState(1);
  const [timbreEnabled, setTimbreEnabled] = useState(false);
  const [timbreAmount, setTimbreAmount] = useState(1);
  const [items, setItems] = useState<LineItem[]>([
    { id: crypto.randomUUID(), product_id: '', description: '', quantity: 1, unit_price: 0, tva_rate: 19 },
  ]);

  useEffect(() => {
    loadInitialData();
  }, []);

  async function loadInitialData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [cRes, pRes, sRes] = await Promise.all([
      supabase.from('clients').select('*').order('name'),
      supabase.from('products').select('*').eq('is_active', true).order('name'),
      supabase.from('company_settings').select('*').eq('user_id', user.id).maybeSingle(),
    ]);

    setClients(cRes.data || []);
    setProducts(pRes.data || []);

    if (sRes.data) {
      setSettings(sRes.data);
      const prefix = sRes.data.invoice_prefix || 'FAC';
      const seq = sRes.data.next_invoice_seq || 1;
      setInvoiceNumber(`${prefix}-${String(seq).padStart(5, '0')}`);
      if (sRes.data.default_fodec_rate != null && sRes.data.default_fodec_rate > 0) {
        setFodecEnabled(true);
        setFodecRate(sRes.data.default_fodec_rate);
      }
      if (sRes.data.default_timbre != null && sRes.data.default_timbre > 0) {
        setTimbreEnabled(true);
        setTimbreAmount(sRes.data.default_timbre);
      }
    }
  }

  function addItem() {
    setItems([...items, { id: crypto.randomUUID(), product_id: '', description: '', quantity: 1, unit_price: 0, tva_rate: 19 }]);
  }

  function removeItem(id: string) {
    if (items.length <= 1) return;
    setItems(items.filter((it) => it.id !== id));
  }

  function updateItem(id: string, field: keyof LineItem, value: string | number) {
    setItems(items.map((it) => {
      if (it.id !== id) return it;
      const updated = { ...it, [field]: value };
      if (field === 'product_id' && value) {
        const product = products.find((p) => p.id === value);
        if (product) {
          updated.description = product.name;
          updated.unit_price = product.base_price;
          updated.tva_rate = product.tva_rate;
        }
      }
      return updated;
    }));
  }

  async function checkNumberUnique(num: string): Promise<boolean> {
    const { count } = await supabase
      .from('invoices')
      .select('id', { count: 'exact', head: true })
      .eq('invoice_number', num);
    return (count || 0) === 0;
  }

  const subtotal = items.reduce((sum, it) => sum + it.quantity * it.unit_price, 0);
  const discountAmount = subtotal * (discountPercent / 100);
  const afterDiscount = subtotal - discountAmount;
  const tvaAmount = items.reduce((sum, it) => {
    const lineHT = it.quantity * it.unit_price;
    const lineDiscount = lineHT * (discountPercent / 100);
    return sum + (lineHT - lineDiscount) * (it.tva_rate / 100);
  }, 0);
  const fodecAmount = fodecEnabled ? afterDiscount * (fodecRate / 100) : 0;
  const timbre = timbreEnabled ? timbreAmount : 0;
  const total = afterDiscount + tvaAmount + fodecAmount + timbre;

  async function handleSave(status: 'draft' | 'validated') {
    setSaving(true);
    setNumberError('');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const isUnique = await checkNumberUnique(invoiceNumber);
    if (!isUnique) {
      setNumberError('Ce numero de facture existe deja');
      setSaving(false);
      return;
    }

    const publicToken = crypto.randomUUID();

    const { data: inv, error } = await supabase.from('invoices').insert({
      user_id: user.id,
      client_id: clientId || null,
      invoice_number: invoiceNumber,
      status,
      issue_date: issueDate,
      due_date: dueDate || null,
      subtotal,
      tva_amount: tvaAmount,
      discount_percent: discountPercent,
      discount_amount: discountAmount,
      fodec_rate: fodecEnabled ? fodecRate : 0,
      fodec_amount: fodecAmount,
      timbre_amount: timbre,
      total,
      public_token: publicToken,
      notes,
    }).select().maybeSingle();

    if (error || !inv) { setSaving(false); return; }

    const lineItems = items.map((it) => ({
      invoice_id: inv.id,
      product_id: it.product_id || null,
      description: it.description,
      quantity: it.quantity,
      unit_price: it.unit_price,
      tva_rate: it.tva_rate,
      total: it.quantity * it.unit_price * (1 + it.tva_rate / 100),
    }));

    await supabase.from('invoice_items').insert(lineItems);

    if (settings) {
      const currentSeq = settings.next_invoice_seq || 1;
      const numberParts = invoiceNumber.match(/-(\d+)$/);
      const usedSeq = numberParts ? parseInt(numberParts[1], 10) : currentSeq;
      const newSeq = Math.max(currentSeq, usedSeq) + 1;
      await supabase.from('company_settings')
        .update({ next_invoice_seq: newSeq })
        .eq('id', settings.id);
    }

    navigate(`/invoices/${inv.id}`);
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/invoices')} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Nouvelle facture</h1>
          <p className="text-sm text-slate-500 mt-0.5">Remplissez les details ci-dessous</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">N de facture</label>
            <input type="text" value={invoiceNumber} onChange={(e) => { setInvoiceNumber(e.target.value); setNumberError(''); }}
              className={`w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 ${numberError ? 'border-red-300 bg-red-50' : 'border-slate-200'}`} />
            {numberError && (
              <p className="mt-1 text-xs text-red-600 flex items-center gap-1"><AlertCircle size={12} />{numberError}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Client</label>
            <select value={clientId} onChange={(e) => setClientId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500">
              <option value="">Selectionner un client</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Date d'emission</label>
            <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Date d'echeance</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-900">Lignes de facture</h3>
            <button onClick={addItem} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-brand-600 hover:bg-brand-50 transition-colors">
              <Plus size={14} /> Ajouter une ligne
            </button>
          </div>

          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="grid grid-cols-12 gap-2 items-end p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="col-span-12 sm:col-span-3">
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Produit</label>
                  <select value={item.product_id} onChange={(e) => updateItem(item.id, 'product_id', e.target.value)}
                    className="w-full px-2 py-2 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-500/20">
                    <option value="">Libre</option>
                    {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="col-span-12 sm:col-span-3">
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Description</label>
                  <input type="text" value={item.description} onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                    className="w-full px-2 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500/20" />
                </div>
                <div className="col-span-4 sm:col-span-1">
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Qte</label>
                  <input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500/20" />
                </div>
                <div className="col-span-4 sm:col-span-2">
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Prix HT</label>
                  <input type="number" step="0.001" value={item.unit_price} onChange={(e) => updateItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500/20" />
                </div>
                <div className="col-span-3 sm:col-span-1">
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">TVA%</label>
                  <input type="number" value={item.tva_rate} onChange={(e) => updateItem(item.id, 'tva_rate', parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500/20" />
                </div>
                <div className="col-span-12 sm:col-span-1 flex items-center justify-between sm:justify-center">
                  <span className="sm:hidden text-xs font-medium text-slate-700">Total: {formatCurrency(item.quantity * item.unit_price)}</span>
                  <span className="hidden sm:block text-xs font-semibold text-slate-700">{formatCurrency(item.quantity * item.unit_price)}</span>
                </div>
                <div className="col-span-12 sm:col-span-1 flex justify-end">
                  <button onClick={() => removeItem(item.id)} disabled={items.length <= 1}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 disabled:opacity-30 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 resize-none"
                placeholder="Conditions de paiement, remarques..." />
            </div>

            <div className="flex flex-wrap gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={fodecEnabled} onChange={(e) => setFodecEnabled(e.target.checked)}
                  className="w-4 h-4 text-brand-600 rounded focus:ring-brand-500" />
                <span className="text-sm text-slate-700">FODEC</span>
                {fodecEnabled && (
                  <input type="number" step="0.1" min="0" max="100" value={fodecRate}
                    onChange={(e) => setFodecRate(parseFloat(e.target.value) || 0)}
                    className="w-16 px-2 py-1 rounded-lg border border-slate-200 text-xs text-right" />
                )}
                {fodecEnabled && <span className="text-xs text-slate-500">%</span>}
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={timbreEnabled} onChange={(e) => setTimbreEnabled(e.target.checked)}
                  className="w-4 h-4 text-brand-600 rounded focus:ring-brand-500" />
                <span className="text-sm text-slate-700">Timbre fiscal</span>
                {timbreEnabled && (
                  <input type="number" step="0.001" min="0" value={timbreAmount}
                    onChange={(e) => setTimbreAmount(parseFloat(e.target.value) || 0)}
                    className="w-20 px-2 py-1 rounded-lg border border-slate-200 text-xs text-right" />
                )}
                {timbreEnabled && <span className="text-xs text-slate-500">DT</span>}
              </label>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <label className="text-sm text-slate-600">Remise (%)</label>
              <input type="number" min="0" max="100" step="1" value={discountPercent}
                onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)}
                className="w-20 px-2 py-1.5 rounded-lg border border-slate-200 text-sm text-right focus:outline-none focus:ring-1 focus:ring-brand-500/20" />
            </div>
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Sous-total HT</span>
                <span className="font-medium text-slate-700">{formatCurrency(subtotal)}</span>
              </div>
              {discountPercent > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Remise ({discountPercent}%)</span>
                  <span className="font-medium text-red-500">-{formatCurrency(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">TVA</span>
                <span className="font-medium text-slate-700">{formatCurrency(tvaAmount)}</span>
              </div>
              {fodecEnabled && fodecAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">FODEC ({fodecRate}%)</span>
                  <span className="font-medium text-slate-700">{formatCurrency(fodecAmount)}</span>
                </div>
              )}
              {timbreEnabled && timbre > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Timbre fiscal</span>
                  <span className="font-medium text-slate-700">{formatCurrency(timbre)}</span>
                </div>
              )}
              <div className="flex justify-between text-base pt-2 border-t border-slate-200">
                <span className="font-semibold text-slate-900">Total TTC</span>
                <span className="font-bold text-slate-900">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-end">
        <button onClick={() => navigate('/invoices')} className="px-6 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
          Annuler
        </button>
        <button onClick={() => handleSave('draft')} disabled={saving}
          className="px-6 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50">
          Enregistrer brouillon
        </button>
        <button onClick={() => handleSave('validated')} disabled={saving}
          className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors disabled:opacity-50">
          Valider la facture
        </button>
      </div>
    </div>
  );
}
