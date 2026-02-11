import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  LayoutDashboard,
  Users,
  Package,
  FileText,
  Truck,
  ShoppingCart,
  DollarSign,
  Factory,
  Settings,
  ClipboardList,
  PackageCheck,
  Receipt,
  ShoppingBag,
  PackageX,
  FileCheck,
  Wallet,
  Download,
} from 'lucide-react';

const commands = [
  { label: 'Tableau de bord', path: '/', icon: LayoutDashboard },
  { label: 'Clients', path: '/clients', icon: Users },
  { label: 'Produits', path: '/products', icon: Package },
  { label: 'Devis', path: '/quotes', icon: ClipboardList },
  { label: 'Nouveau devis', path: '/quotes/new', icon: ClipboardList },
  { label: 'Commandes', path: '/sales-orders', icon: ShoppingBag },
  { label: 'Bons de livraison', path: '/delivery-notes', icon: PackageCheck },
  { label: 'Factures', path: '/invoices', icon: FileText },
  { label: 'Nouvelle facture', path: '/invoices/new', icon: FileText },
  { label: 'Avoirs', path: '/credit-notes', icon: FileCheck },
  { label: 'Retours', path: '/return-orders', icon: PackageX },
  { label: 'Fournisseurs', path: '/suppliers', icon: Truck },
  { label: 'Achats', path: '/purchases', icon: ShoppingCart },
  { label: 'Tresorerie', path: '/treasury', icon: Wallet },
  { label: 'Synthese', path: '/finance', icon: DollarSign },
  { label: 'Depenses', path: '/expenses', icon: Receipt },
  { label: 'Export TEJ', path: '/tej-export', icon: Download },
  { label: 'Production', path: '/production', icon: Factory },
  { label: 'Parametres', path: '/settings', icon: Settings },
];

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export default function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const filtered = commands.filter((c) =>
    c.label.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (open) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
      }
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  function handleSelect(path: string) {
    navigate(path);
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[20vh]" onClick={onClose}>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
          <Search size={18} className="text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher une page..."
            className="flex-1 text-sm bg-transparent outline-none placeholder:text-slate-400"
          />
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-medium text-slate-500">
            ESC
          </kbd>
        </div>
        <div className="max-h-72 overflow-y-auto p-2 scrollbar-thin">
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">Aucun resultat</p>
          ) : (
            filtered.map((cmd) => (
              <button
                key={cmd.path}
                onClick={() => handleSelect(cmd.path)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <cmd.icon size={16} className="text-slate-400" />
                {cmd.label}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
