import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Client, Product, Proforma, ProformaItem } from '../types';

export default function ProformaForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    client_id: '',
    proforma_number: '',
    status: 'draft' as Proforma['status'],
    issue_date: new Date().toISOString().split('T')[0],
    valid_until: '',
    notes: '',
    payment_terms: '',
    delivery_terms: '',
    discount_percent: 0,
    fodec_rate: 1,
    timbre_amount: 1.000,
  });

  const [items, setItems] = useState<Array<Omit<ProformaItem, 'id' | 'proforma_id' | 'created_at'>>>([
    { product_id: null, description: '', quantity: 1, unit_price: 0, tva_rate: 19, discount_percent: 0, total: 0 }
  ]);

  useEffect(() => {
    loadData();
    if (isEdit) loadProforma();
  }, [id]);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [clientsData, productsData, settingsData] = await Promise.all([
      supabase.from('clients').select('*').eq('user_id', user.id).order('name'),
      supabase.from('products').select('*').eq('user_id', user.id).eq('is_active', true).order('name'),
      supabase.from('company_settings').select('*').eq('user_id', user.id).single()
    ]);

    setClients(clientsData.data || []);
    setProducts(productsData.data || []);

    if (!isEdit && settingsData.data) {
      const settings = settingsData.data;
      const nextSeq = settings.next_proforma_seq || 1;
      const proformaNumber = `${settings.proforma_prefix || 'PRO'}-${new Date().getFullYear()}-${String(nextSeq).padStart(5, '0')}`;
      setFormData(prev => ({
        ...prev,
        proforma_number: proformaNumber,
        fodec_rate: settings.default_fodec_rate || 1,
        timbre_amount: settings.default_timbre || 1.000
      }));
    }
  }

  async function loadProforma() {
    const { data } = await supabase
      .from('proformas')
      .select('*, proforma_items(*)')
      .eq('id', id)
      .single();

    if (data) {
      setFormData({
        client_id: data.client_id || '',
        proforma_number: data.proforma_number,
        status: data.status,
        issue_date: data.issue_date,
        valid_until: data.valid_until || '',
        notes: data.notes || '',
        payment_terms: data.payment_terms || '',
        delivery_terms: data.delivery_terms || '',
        discount_percent: Number(data.discount_percent),
        fodec_rate: Number(data.fodec_rate),
        timbre_amount: Number(data.timbre_amount),
      });

      if (data.proforma_items && data.proforma_items.length > 0) {
        setItems(data.proforma_items.map((item: ProformaItem) => ({
          product_id: item.product_id,
          description: item.description,
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price),
          tva_rate: Number(item.tva_rate),
          discount_percent: Number(item.discount_percent),
          total: Number(item.total)
        })));
      }
    }
  }

  function addItem() {
    setItems([...items, { product_id: null, description: '', quantity: 1, unit_price: 0, tva_rate: 19, discount_percent: 0, total: 0 }]);
  }

  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index));
  }

  function updateItem(index: number, field: string, value: any) {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };

    if (field === 'product_id' && value) {
      const product = products.find(p => p.id === value);
      if (product) {
        newItems[index].description = product.name;
        newItems[index].unit_price = Number(product.base_price);
        newItems[index].tva_rate = Number(product.tva_rate);
      }
    }

    if (['quantity', 'unit_price', 'tva_rate', 'discount_percent'].includes(field)) {
      const item = newItems[index];
      const subtotal = item.quantity * item.unit_price;
      const discountAmount = subtotal * (item.discount_percent / 100);
      const afterDiscount = subtotal - discountAmount;
      item.total = afterDiscount * (1 + item.tva_rate / 100);
    }

    setItems(newItems);
  }

  const subtotal = items.reduce((sum, item) => {
    const lineSubtotal = item.quantity * item.unit_price;
    const discountAmount = lineSubtotal * (item.discount_percent / 100);
    return sum + (lineSubtotal - discountAmount);
  }, 0);

  const globalDiscountAmount = subtotal * (formData.discount_percent / 100);
  const afterGlobalDiscount = subtotal - globalDiscountAmount;

  const tvaAmount = items.reduce((sum, item) => {
    const lineSubtotal = item.quantity * item.unit_price;
    const discountAmount = lineSubtotal * (item.discount_percent / 100);
    const afterDiscount = lineSubtotal - discountAmount;
    return sum + (afterDiscount * (item.tva_rate / 100));
  }, 0) * (1 - formData.discount_percent / 100);

  const fodecAmount = afterGlobalDiscount * (formData.fodec_rate / 100);
  const total = afterGlobalDiscount + tvaAmount + fodecAmount + formData.timbre_amount;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const proformaData = {
        user_id: user.id,
        client_id: formData.client_id || null,
        proforma_number: formData.proforma_number,
        status: formData.status,
        issue_date: formData.issue_date,
        valid_until: formData.valid_until || null,
        subtotal: afterGlobalDiscount,
        tva_amount: tvaAmount,
        fodec_rate: formData.fodec_rate,
        fodec_amount: fodecAmount,
        timbre_amount: formData.timbre_amount,
        discount_percent: formData.discount_percent,
        discount_amount: globalDiscountAmount,
        total: total,
        notes: formData.notes,
        payment_terms: formData.payment_terms,
        delivery_terms: formData.delivery_terms,
      };

      if (isEdit) {
        const { error } = await supabase
          .from('proformas')
          .update(proformaData)
          .eq('id', id);

        if (error) throw error;

        await supabase.from('proforma_items').delete().eq('proforma_id', id);

        const itemsData = items.map(item => ({
          proforma_id: id,
          product_id: item.product_id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          tva_rate: item.tva_rate,
          discount_percent: item.discount_percent,
          total: item.total
        }));

        await supabase.from('proforma_items').insert(itemsData);
      } else {
        const { data: proforma, error } = await supabase
          .from('proformas')
          .insert(proformaData)
          .select()
          .single();

        if (error) throw error;

        const itemsData = items.map(item => ({
          proforma_id: proforma.id,
          product_id: item.product_id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          tva_rate: item.tva_rate,
          discount_percent: item.discount_percent,
          total: item.total
        }));

        await supabase.from('proforma_items').insert(itemsData);

        const { data: settings } = await supabase
          .from('company_settings')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (settings) {
          await supabase
            .from('company_settings')
            .update({ next_proforma_seq: (settings.next_proforma_seq || 1) + 1 })
            .eq('id', settings.id);
        }
      }

      navigate('/proformas');
    } catch (error) {
      console.error('Error saving proforma:', error);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/proformas')} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
          <ArrowLeft size={20} className="text-slate-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{isEdit ? 'Modifier' : 'Nouvelle'} Proforma</h1>
          <p className="text-sm text-slate-500 mt-0.5">{formData.proforma_number}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Informations generales</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Client</label>
              <select value={formData.client_id} onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500">
                <option value="">Selectionner un client</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Numero proforma</label>
              <input type="text" value={formData.proforma_number} onChange={(e) => setFormData({ ...formData, proforma_number: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Date d emission</label>
              <input type="date" value={formData.issue_date} onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Valide jusqu au</label>
              <input type="date" value={formData.valid_until} onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Statut</label>
              <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as Proforma['status'] })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500">
                <option value="draft">Brouillon</option>
                <option value="sent">Envoyée</option>
                <option value="accepted">Acceptée</option>
                <option value="rejected">Refusée</option>
                <option value="expired">Expirée</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Remise globale (%)</label>
              <input type="number" step="0.01" value={formData.discount_percent} onChange={(e) => setFormData({ ...formData, discount_percent: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Lignes de la proforma</h2>
            <button type="button" onClick={addItem} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-brand-600 hover:bg-brand-50 rounded-lg transition-colors">
              <Plus size={16} />
              Ajouter
            </button>
          </div>
          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={index} className="flex gap-2 items-start p-3 bg-slate-50 rounded-xl">
                <div className="flex-1 grid grid-cols-2 md:grid-cols-6 gap-2">
                  <select value={item.product_id || ''} onChange={(e) => updateItem(index, 'product_id', e.target.value || null)}
                    className="px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20">
                    <option value="">Produit...</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <input type="text" placeholder="Description" value={item.description} onChange={(e) => updateItem(index, 'description', e.target.value)}
                    className="px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
                  <input type="number" step="0.01" placeholder="Qte" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                    className="px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
                  <input type="number" step="0.001" placeholder="P.U." value={item.unit_price} onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                    className="px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
                  <input type="number" step="0.01" placeholder="TVA %" value={item.tva_rate} onChange={(e) => updateItem(index, 'tva_rate', parseFloat(e.target.value) || 0)}
                    className="px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
                  <div className="text-xs font-semibold text-slate-900 flex items-center">
                    {item.total.toFixed(3)} DT
                  </div>
                </div>
                <button type="button" onClick={() => removeItem(index)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Conditions</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Conditions de paiement</label>
                <textarea value={formData.payment_terms} onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                  rows={3} className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  placeholder="Ex: 50% a la commande, 50% a la livraison" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Conditions de livraison</label>
                <textarea value={formData.delivery_terms} onChange={(e) => setFormData({ ...formData, delivery_terms: e.target.value })}
                  rows={3} className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  placeholder="Ex: Livraison sous 15 jours" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes</label>
                <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3} className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Totaux</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Sous-total HT</span>
                <span className="font-semibold text-slate-900">{subtotal.toFixed(3)} DT</span>
              </div>
              {formData.discount_percent > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Remise ({formData.discount_percent}%)</span>
                  <span className="font-semibold text-red-600">-{globalDiscountAmount.toFixed(3)} DT</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">TVA</span>
                <span className="font-semibold text-slate-900">{tvaAmount.toFixed(3)} DT</span>
              </div>
              {formData.fodec_rate > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">FODEC ({formData.fodec_rate}%)</span>
                  <span className="font-semibold text-slate-900">{fodecAmount.toFixed(3)} DT</span>
                </div>
              )}
              {formData.timbre_amount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Timbre</span>
                  <span className="font-semibold text-slate-900">{formData.timbre_amount.toFixed(3)} DT</span>
                </div>
              )}
              <div className="pt-3 border-t border-slate-200 flex justify-between">
                <span className="font-semibold text-slate-900">Total TTC</span>
                <span className="text-xl font-bold text-brand-600">{total.toFixed(3)} DT</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate('/proformas')} className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors">
            Annuler
          </button>
          <button type="submit" disabled={loading} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors disabled:opacity-50">
            <Save size={16} />
            {loading ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </div>
  );
}
