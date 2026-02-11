import { useState, useEffect } from 'react';
import { Search, Package, Clock, CheckCircle2, XCircle, Truck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatDate } from '../lib/utils';
import EmptyState from '../components/ui/EmptyState';

interface Order {
  id: string;
  invoice_number: string;
  status: string;
  created_at: string;
  total: number;
  clients: {
    name: string;
  };
}

export default function OrderTracking() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchOrders();
  }, []);

  async function fetchOrders() {
    setLoading(true);
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        id,
        invoice_number,
        status,
        created_at,
        total,
        clients (name)
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setOrders(data.map((d: any) => ({
        ...d,
        clients: Array.isArray(d.clients) ? d.clients[0] : d.clients,
      })));
    }
    setLoading(false);
  }

  const filteredOrders = orders.filter((order) =>
    order.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.clients?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  function getStatusIcon(status: string) {
    switch (status) {
      case 'draft':
        return <Clock className="w-5 h-5 text-slate-500" />;
      case 'validated':
        return <Package className="w-5 h-5 text-blue-500" />;
      case 'sent':
        return <Truck className="w-5 h-5 text-orange-500" />;
      case 'paid':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Package className="w-5 h-5 text-slate-500" />;
    }
  }

  function getStatusLabel(status: string) {
    const labels: Record<string, string> = {
      draft: 'Brouillon',
      validated: 'Validée',
      sent: 'Envoyée',
      paid: 'Payée',
      cancelled: 'Annulée'
    };
    return labels[status] || status;
  }

  function getStatusColor(status: string) {
    const colors: Record<string, string> = {
      draft: 'bg-slate-100 text-slate-700',
      validated: 'bg-blue-100 text-blue-700',
      sent: 'bg-orange-100 text-orange-700',
      paid: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700'
    };
    return colors[status] || 'bg-slate-100 text-slate-700';
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
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Suivi des Commandes</h1>
        <p className="text-slate-600 mt-1">Suivez l'état de vos commandes en temps réel</p>
      </div>

      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher par numéro de commande ou client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        {filteredOrders.length === 0 ? (
          <EmptyState
            icon={<Package size={32} />}
            title="Aucune commande"
            description="Vos commandes apparaîtront ici"
          />
        ) : (
          <div className="space-y-3">
            {filteredOrders.map((order) => (
              <div
                key={order.id}
                className="p-4 border border-slate-200 rounded-xl hover:border-brand-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="mt-1">{getStatusIcon(order.status)}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-900">{order.invoice_number}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {getStatusLabel(order.status)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600">{order.clients?.name}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {formatDate(order.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">
                      {order.total.toFixed(3)} DT
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
