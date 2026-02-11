import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, FileText, Truck, FileCheck, Printer, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { SalesOrder, Client } from '../types';
import { formatCurrency, formatDate } from '../lib/utils';
import StatusBadge from '../components/ui/StatusBadge';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';

const STATUS_OPTIONS = [
  { value: '', label: 'Tous les statuts' },
  { value: 'draft', label: 'Brouillon' },
  { value: 'confirmed', label: 'Confirmée' },
  { value: 'in_production', label: 'En production' },
  { value: 'delivered', label: 'Livrée' },
  { value: 'invoiced', label: 'Facturée' },
];

export default function SalesOrders() {
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSalesOrders();
    fetchClients();
  }, []);

  async function fetchSalesOrders() {
    setLoading(true);
    const { data, error } = await supabase
      .from('sales_orders')
      .select(`
        *,
        clients (*)
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setSalesOrders(data);
    }
    setLoading(false);
  }

  async function fetchClients() {
    const { data } = await supabase.from('clients').select('*').order('name');
    if (data) setClients(data);
  }

  const filteredOrders = salesOrders.filter((order) => {
    const matchesSearch =
      order.so_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.clients?.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  async function updateStatus(orderId: string, newStatus: SalesOrder['status']) {
    const { error } = await supabase
      .from('sales_orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (!error) {
      fetchSalesOrders();
    }
  }

  async function convertToBL(order: SalesOrder) {
    const { data: settings } = await supabase
      .from('company_settings')
      .select('*')
      .single();

    const blNumber = settings
      ? `${settings.dn_prefix || 'BL'}-${String(settings.next_dn_seq || 1).padStart(4, '0')}`
      : `BL-${Date.now()}`;

    const { data: items } = await supabase
      .from('sales_order_items')
      .select('*')
      .eq('sales_order_id', order.id);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: bl, error: blError } = await supabase
      .from('delivery_notes')
      .insert({
        user_id: user.id,
        dn_number: blNumber,
        client_id: order.client_id,
        delivery_date: new Date().toISOString().split('T')[0],
        address: order.clients?.address || '',
        notes: `Généré depuis commande ${order.so_number}`,
        status: 'draft',
      })
      .select()
      .single();

    if (blError || !bl) return;

    if (items) {
      await supabase.from('delivery_note_items').insert(
        items.map((item) => ({
          delivery_note_id: bl.id,
          product_id: item.product_id,
          description: item.notes || '',
          quantity: item.quantity,
        }))
      );
    }

    await supabase
      .from('sales_orders')
      .update({ linked_bl_id: bl.id, status: 'delivered' })
      .eq('id', order.id);

    if (settings) {
      await supabase
        .from('company_settings')
        .update({ next_dn_seq: (settings.next_dn_seq || 1) + 1 })
        .eq('id', settings.id);
    }

    fetchSalesOrders();
    navigate(`/delivery-notes`);
  }

  async function convertToInvoice(order: SalesOrder) {
    const { data: settings } = await supabase
      .from('company_settings')
      .select('*')
      .single();

    const invNumber = settings
      ? `${settings.invoice_prefix || 'FAC'}-${String(settings.next_invoice_seq || 1).padStart(4, '0')}`
      : `FAC-${Date.now()}`;

    const { data: items } = await supabase
      .from('sales_order_items')
      .select('*')
      .eq('sales_order_id', order.id);

    const { data: { user: invUser } } = await supabase.auth.getUser();
    if (!invUser) return;

    const { data: invoice, error: invError } = await supabase
      .from('invoices')
      .insert({
        user_id: invUser.id,
        invoice_number: invNumber,
        client_id: order.client_id,
        status: 'draft',
        issue_date: new Date().toISOString().split('T')[0],
        subtotal: order.amount_ht,
        tva_amount: order.amount_tva,
        discount_percent: 0,
        discount_amount: 0,
        fodec_rate: 0,
        fodec_amount: 0,
        timbre_amount: 0,
        total: order.amount_ttc,
        public_token: crypto.randomUUID(),
        notes: `Généré depuis commande ${order.so_number}`,
      })
      .select()
      .single();

    if (invError || !invoice) return;

    if (items) {
      await supabase.from('invoice_items').insert(
        items.map((item) => ({
          invoice_id: invoice.id,
          product_id: item.product_id,
          description: item.notes || '',
          quantity: item.quantity,
          unit_price: item.unit_price,
          tva_rate: item.tva_rate,
          total: item.total_ttc,
        }))
      );
    }

    await supabase
      .from('sales_orders')
      .update({ linked_invoice_id: invoice.id, status: 'invoiced' })
      .eq('id', order.id);

    if (settings) {
      await supabase
        .from('company_settings')
        .update({ next_invoice_seq: (settings.next_invoice_seq || 1) + 1 })
        .eq('id', settings.id);
    }

    fetchSalesOrders();
    navigate(`/invoices/${invoice.id}`);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Commandes Clients</h1>
          <p className="text-slate-600 mt-1">Gérez vos commandes clients</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-brand-500 to-brand-600 text-white rounded-xl hover:from-brand-600 hover:to-brand-700 transition-all"
        >
          <Plus className="w-5 h-5" />
          Nouvelle Commande
        </button>
      </div>

      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher par numéro ou client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-10 pr-8 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 appearance-none bg-white"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredOrders.length === 0 ? (
          <EmptyState
            icon={<FileText size={32} />}
            title="Aucune commande"
            description="Créez votre première commande client"
            action={<button onClick={() => setShowCreateModal(true)} className="px-4 py-2 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700">Nouvelle Commande</button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Numéro</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Client</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Montant TTC</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Statut</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <span className="font-medium text-slate-900">{order.so_number}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-slate-700">{order.clients?.name}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{formatDate(order.created_at)}</td>
                    <td className="py-3 px-4 font-medium">{formatCurrency(order.amount_ttc)}</td>
                    <td className="py-3 px-4">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="text-brand-600 hover:text-brand-700"
                      >
                        Détails
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedOrder && (
        <Modal
          open={true}
          onClose={() => setSelectedOrder(null)}
          title={`Commande ${selectedOrder.so_number}`}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-600">Client</p>
                <p className="font-medium">{selectedOrder.clients?.name}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Statut</p>
                <StatusBadge status={selectedOrder.status} />
              </div>
              <div>
                <p className="text-sm text-slate-600">Montant HT</p>
                <p className="font-medium">{formatCurrency(selectedOrder.amount_ht)}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Montant TTC</p>
                <p className="font-medium">{formatCurrency(selectedOrder.amount_ttc)}</p>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-4 border-t">
              {selectedOrder.status === 'draft' && (
                <button
                  onClick={() => {
                    updateStatus(selectedOrder.id, 'confirmed');
                    setSelectedOrder(null);
                  }}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <ChevronRight className="w-4 h-4" />
                  Confirmer
                </button>
              )}

              {selectedOrder.status === 'confirmed' && (
                <button
                  onClick={() => {
                    updateStatus(selectedOrder.id, 'in_production');
                    setSelectedOrder(null);
                  }}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
                >
                  <ChevronRight className="w-4 h-4" />
                  Mettre en production
                </button>
              )}

              {(selectedOrder.status === 'confirmed' || selectedOrder.status === 'in_production') && (
                <button
                  onClick={() => {
                    convertToBL(selectedOrder);
                    setSelectedOrder(null);
                  }}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
                >
                  <Truck className="w-4 h-4" />
                  Générer BL
                </button>
              )}

              {selectedOrder.status === 'delivered' && (
                <button
                  onClick={() => {
                    convertToInvoice(selectedOrder);
                    setSelectedOrder(null);
                  }}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                >
                  <FileCheck className="w-4 h-4" />
                  Générer Facture
                </button>
              )}

              <button
                onClick={() => navigate(`/print/sales-order/${selectedOrder.id}`)}
                className="flex items-center justify-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                <Printer className="w-4 h-4" />
                Imprimer
              </button>
            </div>
          </div>
        </Modal>
      )}

      {showCreateModal && (
        <CreateSalesOrderModal
          clients={clients}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchSalesOrders();
          }}
        />
      )}
    </div>
  );
}

function CreateSalesOrderModal({
  clients,
  onClose,
  onSuccess,
}: {
  clients: Client[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [clientId, setClientId] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([{ description: '', quantity: 1, unit_price: 0, tva_rate: 19 }]);
  const [saving, setSaving] = useState(false);

  const calculateTotals = () => {
    let totalHT = 0;
    let totalTVA = 0;

    items.forEach((item) => {
      const ht = item.quantity * item.unit_price;
      const tva = ht * (item.tva_rate / 100);
      totalHT += ht;
      totalTVA += tva;
    });

    return {
      totalHT,
      totalTVA,
      totalTTC: totalHT + totalTVA,
    };
  };

  const totals = calculateTotals();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const { data: settings } = await supabase.from('company_settings').select('*').single();

    const soNumber = settings
      ? `${settings.so_prefix || 'CMD'}-${String(settings.so_next || 1).padStart(4, '0')}`
      : `CMD-${Date.now()}`;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const { data: order, error } = await supabase
      .from('sales_orders')
      .insert({
        user_id: user.id,
        so_number: soNumber,
        client_id: clientId || null,
        status: 'draft',
        amount_ht: totals.totalHT,
        amount_tva: totals.totalTVA,
        amount_ttc: totals.totalTTC,
        delivery_date: deliveryDate || null,
        notes,
      })
      .select()
      .single();

    if (!error && order) {
      await supabase.from('sales_order_items').insert(
        items.map((item) => ({
          sales_order_id: order.id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          tva_rate: item.tva_rate,
          total_ht: item.quantity * item.unit_price,
          total_tva: item.quantity * item.unit_price * (item.tva_rate / 100),
          total_ttc: item.quantity * item.unit_price * (1 + item.tva_rate / 100),
          notes: item.description,
        }))
      );

      if (settings) {
        await supabase
          .from('company_settings')
          .update({ so_next: (settings.so_next || 1) + 1 })
          .eq('id', settings.id);
      }

      onSuccess();
    }

    setSaving(false);
  }

  return (
    <Modal open={true} onClose={onClose} title="Nouvelle Commande Client">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Client</label>
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            required
          >
            <option value="">Sélectionner un client</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Date de livraison</label>
          <input
            type="date"
            value={deliveryDate}
            onChange={(e) => setDeliveryDate(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Lignes de commande</label>
          {items.map((item, index) => (
            <div key={index} className="grid grid-cols-12 gap-2 mb-2">
              <input
                type="text"
                placeholder="Description"
                value={item.description}
                onChange={(e) => {
                  const newItems = [...items];
                  newItems[index].description = e.target.value;
                  setItems(newItems);
                }}
                className="col-span-5 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                required
              />
              <input
                type="number"
                placeholder="Qté"
                value={item.quantity}
                onChange={(e) => {
                  const newItems = [...items];
                  newItems[index].quantity = Number(e.target.value);
                  setItems(newItems);
                }}
                className="col-span-2 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                min="1"
                required
              />
              <input
                type="number"
                placeholder="Prix HT"
                value={item.unit_price}
                onChange={(e) => {
                  const newItems = [...items];
                  newItems[index].unit_price = Number(e.target.value);
                  setItems(newItems);
                }}
                className="col-span-3 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                step="0.001"
                required
              />
              <input
                type="number"
                placeholder="TVA%"
                value={item.tva_rate}
                onChange={(e) => {
                  const newItems = [...items];
                  newItems[index].tva_rate = Number(e.target.value);
                  setItems(newItems);
                }}
                className="col-span-2 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                required
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() => setItems([...items, { description: '', quantity: 1, unit_price: 0, tva_rate: 19 }])}
            className="text-brand-600 text-sm hover:text-brand-700"
          >
            + Ajouter une ligne
          </button>
        </div>

        <div className="bg-slate-50 p-4 rounded-lg space-y-1">
          <div className="flex justify-between text-sm">
            <span>Total HT:</span>
            <span className="font-medium">{formatCurrency(totals.totalHT)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Total TVA:</span>
            <span className="font-medium">{formatCurrency(totals.totalTVA)}</span>
          </div>
          <div className="flex justify-between text-base font-semibold pt-1 border-t">
            <span>Total TTC:</span>
            <span>{formatCurrency(totals.totalTTC)}</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="flex gap-2 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50"
          >
            {saving ? 'Enregistrement...' : 'Créer'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            Annuler
          </button>
        </div>
      </form>
    </Modal>
  );
}
