import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search, Filter, FileText, Printer } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { CreditNote, Client, Invoice } from '../types';
import { formatCurrency, formatDate } from '../lib/utils';
import StatusBadge from '../components/ui/StatusBadge';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';

const STATUS_OPTIONS = [
  { value: '', label: 'Tous les statuts' },
  { value: 'draft', label: 'Brouillon' },
  { value: 'validated', label: 'Validé' },
  { value: 'applied', label: 'Appliqué' },
];

export default function CreditNotes() {
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedNote, setSelectedNote] = useState<CreditNote | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    fetchCreditNotes();
    fetchClients();
    fetchInvoices();

    const invoiceId = searchParams.get('from_invoice');
    if (invoiceId) {
      setShowCreateModal(true);
    }
  }, [searchParams]);

  async function fetchCreditNotes() {
    setLoading(true);
    const { data, error } = await supabase
      .from('credit_notes')
      .select(`
        *,
        clients (*),
        invoices (invoice_number)
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setCreditNotes(data);
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
      .eq('status', 'validated')
      .order('invoice_number', { ascending: false });
    if (data) setInvoices(data);
  }

  const filteredNotes = creditNotes.filter((note) => {
    const matchesSearch =
      note.cn_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.clients?.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || note.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  async function updateStatus(noteId: string, newStatus: CreditNote['status']) {
    const { error } = await supabase
      .from('credit_notes')
      .update({ status: newStatus })
      .eq('id', noteId);

    if (!error) {
      fetchCreditNotes();
      setSelectedNote(null);
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
          <h1 className="text-2xl font-bold text-slate-900">Avoirs (Notes de crédit)</h1>
          <p className="text-slate-600 mt-1">Gérez vos avoirs clients</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-brand-500 to-brand-600 text-white rounded-xl hover:from-brand-600 hover:to-brand-700 transition-all"
        >
          <Plus className="w-5 h-5" />
          Nouvel Avoir
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

        {filteredNotes.length === 0 ? (
          <EmptyState
            icon={<FileText size={32} />}
            title="Aucun avoir"
            description="Créez votre premier avoir"
            action={<button onClick={() => setShowCreateModal(true)} className="px-4 py-2 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700">Nouvel Avoir</button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Numéro</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Client</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Facture</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Montant TTC</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Statut</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredNotes.map((note) => (
                  <tr key={note.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <span className="font-medium text-slate-900">{note.cn_number}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-slate-700">{note.clients?.name}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {note.invoices?.invoice_number || '-'}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{formatDate(note.created_at)}</td>
                    <td className="py-3 px-4 font-medium text-red-600">
                      -{formatCurrency(note.amount_ttc)}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={note.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedNote(note)}
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

      {selectedNote && (
        <Modal
          open={true}
          onClose={() => setSelectedNote(null)}
          title={`Avoir ${selectedNote.cn_number}`}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-600">Client</p>
                <p className="font-medium">{selectedNote.clients?.name}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Statut</p>
                <StatusBadge status={selectedNote.status} />
              </div>
              <div>
                <p className="text-sm text-slate-600">Type</p>
                <p className="font-medium capitalize">{selectedNote.type}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Date</p>
                <p className="font-medium">{formatDate(selectedNote.created_at)}</p>
              </div>
            </div>

            <div className="bg-red-50 p-4 rounded-lg space-y-1">
              <div className="flex justify-between text-sm">
                <span>Montant HT:</span>
                <span className="font-medium text-red-700">-{formatCurrency(selectedNote.amount_ht)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>TVA:</span>
                <span className="font-medium text-red-700">-{formatCurrency(selectedNote.amount_tva)}</span>
              </div>
              <div className="flex justify-between text-base font-semibold pt-1 border-t border-red-200">
                <span>Total TTC:</span>
                <span className="text-red-700">-{formatCurrency(selectedNote.amount_ttc)}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-4 border-t">
              {selectedNote.status === 'draft' && (
                <button
                  onClick={() => updateStatus(selectedNote.id, 'validated')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Valider
                </button>
              )}

              {selectedNote.status === 'validated' && (
                <button
                  onClick={() => updateStatus(selectedNote.id, 'applied')}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                >
                  Marquer comme appliqué
                </button>
              )}

              <button
                onClick={() => navigate(`/print/credit-note/${selectedNote.id}`)}
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
        <CreateCreditNoteModal
          clients={clients}
          invoices={invoices}
          preselectedInvoiceId={searchParams.get('from_invoice')}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchCreditNotes();
          }}
        />
      )}
    </div>
  );
}

function CreateCreditNoteModal({
  clients,
  invoices,
  preselectedInvoiceId,
  onClose,
  onSuccess,
}: {
  clients: Client[];
  invoices: Invoice[];
  preselectedInvoiceId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [clientId, setClientId] = useState('');
  const [invoiceId, setInvoiceId] = useState(preselectedInvoiceId || '');
  const [type, setType] = useState<'total' | 'partial'>('partial');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([
    { description: '', quantity: 1, unit_price: 0, tva_rate: 19 },
  ]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (invoiceId) {
      loadInvoiceData(invoiceId);
    }
  }, [invoiceId]);

  async function loadInvoiceData(invId: string) {
    const { data: invoice } = await supabase
      .from('invoices')
      .select('*, invoice_items(*), clients(*)')
      .eq('id', invId)
      .single();

    if (invoice) {
      setClientId(invoice.client_id);

      if (invoice.invoice_items && invoice.invoice_items.length > 0) {
        setItems(
          invoice.invoice_items.map((item: any) => ({
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            tva_rate: item.tva_rate,
          }))
        );
      }
    }
  }

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

    const cnNumber = settings
      ? `${settings.cn_prefix || 'AV'}-${String(settings.cn_next || 1).padStart(4, '0')}`
      : `AV-${Date.now()}`;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const { data: creditNote, error } = await supabase
      .from('credit_notes')
      .insert({
        user_id: user.id,
        cn_number: cnNumber,
        client_id: clientId || null,
        invoice_id: invoiceId || null,
        type,
        status: 'draft',
        amount_ht: totals.totalHT,
        amount_tva: totals.totalTVA,
        amount_ttc: totals.totalTTC,
        notes,
      })
      .select()
      .single();

    if (!error && creditNote) {
      await supabase.from('credit_note_items').insert(
        items.map((item) => ({
          credit_note_id: creditNote.id,
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
          .update({ cn_next: (settings.cn_next || 1) + 1 })
          .eq('id', settings.id);
      }

      onSuccess();
    }

    setSaving(false);
  }

  return (
    <Modal open={true} onClose={onClose} title="Nouvel Avoir">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Facture d'origine (optionnel)
          </label>
          <select
            value={invoiceId}
            onChange={(e) => setInvoiceId(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">Sélectionner une facture</option>
            {invoices.map((invoice) => (
              <option key={invoice.id} value={invoice.id}>
                {invoice.invoice_number} - {formatCurrency(invoice.total)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Client *</label>
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            required
            disabled={!!invoiceId}
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
          <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                value="partial"
                checked={type === 'partial'}
                onChange={(e) => setType(e.target.value as 'partial')}
                className="text-brand-600"
              />
              <span className="text-sm">Partiel</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                value="total"
                checked={type === 'total'}
                onChange={(e) => setType(e.target.value as 'total')}
                className="text-brand-600"
              />
              <span className="text-sm">Total</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Lignes</label>
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

        <div className="bg-red-50 p-4 rounded-lg space-y-1">
          <div className="flex justify-between text-sm">
            <span>Total HT:</span>
            <span className="font-medium text-red-700">-{formatCurrency(totals.totalHT)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Total TVA:</span>
            <span className="font-medium text-red-700">-{formatCurrency(totals.totalTVA)}</span>
          </div>
          <div className="flex justify-between text-base font-semibold pt-1 border-t border-red-200">
            <span>Total TTC:</span>
            <span className="text-red-700">-{formatCurrency(totals.totalTTC)}</span>
          </div>
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
