import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, PackageX, Printer } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ReturnOrder, Client, Invoice } from '../types';
import { formatDate } from '../lib/utils';
import StatusBadge from '../components/ui/StatusBadge';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';

const STATUS_OPTIONS = [
  { value: '', label: 'Tous les statuts' },
  { value: 'draft', label: 'Brouillon' },
  { value: 'validated', label: 'Validé' },
  { value: 'processed', label: 'Traité' },
  { value: 'closed', label: 'Clôturé' },
];

export default function ReturnOrders() {
  const [returnOrders, setReturnOrders] = useState<ReturnOrder[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ReturnOrder | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchReturnOrders();
    fetchClients();
    fetchInvoices();
  }, []);

  async function fetchReturnOrders() {
    setLoading(true);
    const { data, error } = await supabase
      .from('return_orders')
      .select(`
        *,
        clients (*)
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setReturnOrders(data);
    }
    setLoading(false);
  }

  async function fetchClients() {
    const { data } = await supabase.from('clients').select('*').order('name');
    if (data) setClients(data);
  }

  async function fetchInvoices() {
    const { data } = await supabase
      .from('invoices')
      .select('*')
      .order('invoice_number', { ascending: false });
    if (data) setInvoices(data);
  }

  const filteredOrders = returnOrders.filter((order) => {
    const matchesSearch =
      order.rn_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.clients?.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  async function updateStatus(orderId: string, newStatus: ReturnOrder['status']) {
    const { error } = await supabase
      .from('return_orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (!error) {
      fetchReturnOrders();
      setSelectedOrder(null);
    }
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
          <h1 className="text-2xl font-bold text-slate-900">Bons de Retour</h1>
          <p className="text-slate-600 mt-1">Gérez les retours clients</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-brand-500 to-brand-600 text-white rounded-xl hover:from-brand-600 hover:to-brand-700 transition-all"
        >
          <Plus className="w-5 h-5" />
          Nouveau Retour
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
            icon={<PackageX size={32} />}
            title="Aucun bon de retour"
            description="Créez votre premier bon de retour"
            action={<button onClick={() => setShowCreateModal(true)} className="px-4 py-2 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700">Nouveau Retour</button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Numéro</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Client</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Motif</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Statut</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <span className="font-medium text-slate-900">{order.rn_number}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-slate-700">{order.clients?.name}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{formatDate(order.created_at)}</td>
                    <td className="py-3 px-4 text-slate-600 truncate max-w-xs">
                      {order.return_reason || '-'}
                    </td>
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
          title={`Bon de retour ${selectedOrder.rn_number}`}
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
                <p className="text-sm text-slate-600">Retour en stock</p>
                <p className="font-medium">{selectedOrder.return_to_stock ? 'Oui' : 'Non'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Date</p>
                <p className="font-medium">{formatDate(selectedOrder.created_at)}</p>
              </div>
            </div>

            {selectedOrder.return_reason && (
              <div>
                <p className="text-sm text-slate-600">Motif du retour</p>
                <p className="text-slate-900 mt-1">{selectedOrder.return_reason}</p>
              </div>
            )}

            <div className="flex flex-col gap-2 pt-4 border-t">
              {selectedOrder.status === 'draft' && (
                <button
                  onClick={() => updateStatus(selectedOrder.id, 'validated')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Valider
                </button>
              )}

              {selectedOrder.status === 'validated' && (
                <button
                  onClick={() => updateStatus(selectedOrder.id, 'processed')}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                >
                  Marquer comme traité
                </button>
              )}

              {selectedOrder.status === 'processed' && (
                <button
                  onClick={() => updateStatus(selectedOrder.id, 'closed')}
                  className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700"
                >
                  Clôturer
                </button>
              )}

              <button
                onClick={() => navigate(`/print/return-order/${selectedOrder.id}`)}
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
        <CreateReturnOrderModal
          clients={clients}
          invoices={invoices}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchReturnOrders();
          }}
        />
      )}
    </div>
  );
}

function CreateReturnOrderModal({
  clients,
  invoices,
  onClose,
  onSuccess,
}: {
  clients: Client[];
  invoices: Invoice[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [clientId, setClientId] = useState('');
  const [invoiceId, setInvoiceId] = useState('');
  const [returnReason, setReturnReason] = useState('');
  const [returnToStock, setReturnToStock] = useState(true);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([
    { description: '', quantity: 1, unit_price: 0, tva_rate: 19 },
  ]);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const { data: settings } = await supabase.from('company_settings').select('*').single();

    const rnNumber = settings
      ? `${settings.rn_prefix || 'BR'}-${String(settings.rn_next || 1).padStart(4, '0')}`
      : `BR-${Date.now()}`;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const { data: order, error } = await supabase
      .from('return_orders')
      .insert({
        user_id: user.id,
        rn_number: rnNumber,
        client_id: clientId || null,
        invoice_id: invoiceId || null,
        status: 'draft',
        return_reason: returnReason,
        return_to_stock: returnToStock,
        notes,
      })
      .select()
      .single();

    if (!error && order) {
      await supabase.from('return_order_items').insert(
        items.map((item) => ({
          return_order_id: order.id,
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
          .update({ rn_next: (settings.rn_next || 1) + 1 })
          .eq('id', settings.id);
      }

      onSuccess();
    }

    setSaving(false);
  }

  return (
    <Modal open={true} onClose={onClose} title="Nouveau Bon de Retour">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Client *</label>
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
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Facture associée (optionnel)
          </label>
          <select
            value={invoiceId}
            onChange={(e) => setInvoiceId(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">Aucune</option>
            {invoices.map((invoice) => (
              <option key={invoice.id} value={invoice.id}>
                {invoice.invoice_number}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Motif du retour</label>
          <textarea
            value={returnReason}
            onChange={(e) => setReturnReason(e.target.value)}
            rows={2}
            placeholder="Ex: Produit défectueux, erreur de livraison..."
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="returnToStock"
            checked={returnToStock}
            onChange={(e) => setReturnToStock(e.target.checked)}
            className="w-4 h-4 text-brand-600 rounded focus:ring-brand-500"
          />
          <label htmlFor="returnToStock" className="text-sm text-slate-700">
            Retour en stock
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Articles retournés</label>
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
            onClick={() =>
              setItems([...items, { description: '', quantity: 1, unit_price: 0, tva_rate: 19 }])
            }
            className="text-brand-600 text-sm hover:text-brand-700"
          >
            + Ajouter une ligne
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
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
