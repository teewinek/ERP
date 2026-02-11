import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Package,
  FileText,
  Truck,
  ShoppingCart,
  DollarSign,
  Factory,
  Settings,
  ChevronDown,
  Printer,
  X,
  ClipboardList,
  PackageCheck,
  Receipt,
  ShoppingBag,
  PackageX,
  FileCheck,
  Wallet,
  Download,
  UserCircle,
  MapPin,
  MessageSquare,
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const navSections = [
  {
    title: 'Principal',
    items: [
      { label: 'Tableau de bord', path: '/', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Commercial',
    items: [
      { label: 'Clients', path: '/clients', icon: Users },
      { label: 'Produits', path: '/products', icon: Package },
      { label: 'Devis', path: '/quotes', icon: ClipboardList },
      { label: 'Proformas', path: '/proformas', icon: Receipt },
      { label: 'Commandes', path: '/sales-orders', icon: ShoppingBag },
      { label: 'Bons de livraison', path: '/delivery-notes', icon: PackageCheck },
      { label: 'Factures', path: '/invoices', icon: FileText },
      { label: 'Avoirs', path: '/credit-notes', icon: FileCheck },
      { label: 'Retours', path: '/return-orders', icon: PackageX },
    ],
  },
  {
    title: 'Achats',
    items: [
      { label: 'Fournisseurs', path: '/suppliers', icon: Truck },
      { label: 'Bons de commande', path: '/purchases', icon: ShoppingCart },
    ],
  },
  {
    title: 'Finance',
    items: [
      { label: 'Tresorerie', path: '/treasury', icon: Wallet },
      { label: 'Synthese', path: '/finance', icon: DollarSign },
      { label: 'Depenses', path: '/expenses', icon: Receipt },
      { label: 'Export TEJ', path: '/tej-export', icon: Download },
    ],
  },
  {
    title: 'Production',
    items: [
      { label: 'Travaux', path: '/production', icon: Factory },
    ],
  },
  {
    title: 'Mon Compte',
    items: [
      { label: 'Mon Profil', path: '/profile', icon: UserCircle },
      { label: 'Suivi Commandes', path: '/order-tracking', icon: MapPin },
      { label: 'Contact', path: '/contact', icon: MessageSquare },
    ],
  },
  {
    title: 'Systeme',
    items: [
      { label: 'Parametres', path: '/settings', icon: Settings },
    ],
  },
];

export default function Sidebar({ open, onClose }: SidebarProps) {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  function toggleSection(title: string) {
    setCollapsed((prev) => ({ ...prev, [title]: !prev[title] }));
  }

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={onClose} />
      )}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-64 bg-slate-925 text-white flex flex-col transition-transform duration-300 lg:translate-x-0 lg:static lg:z-auto',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between px-5 py-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center">
              <Printer size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-wide">Teewinek</h1>
              <p className="text-[10px] text-slate-400 font-medium tracking-widest uppercase">ERP PRO</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden p-1 rounded-lg hover:bg-white/10 text-slate-400">
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 scrollbar-thin">
          {navSections.map((section) => (
            <div key={section.title} className="mb-2">
              <button
                onClick={() => toggleSection(section.title)}
                className="flex items-center justify-between w-full px-2 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider hover:text-slate-300 transition-colors"
              >
                {section.title}
                <ChevronDown
                  size={12}
                  className={cn(
                    'transition-transform duration-200',
                    collapsed[section.title] && '-rotate-90'
                  )}
                />
              </button>
              {!collapsed[section.title] && (
                <div className="space-y-0.5 mt-1">
                  {section.items.map((item) => {
                    const isActive = item.path === '/'
                      ? location.pathname === '/'
                      : location.pathname.startsWith(item.path);
                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={onClose}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200',
                          isActive
                            ? 'bg-brand-500/15 text-brand-400'
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                        )}
                      >
                        <item.icon size={17} strokeWidth={isActive ? 2 : 1.5} />
                        {item.label}
                      </NavLink>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-white/5">
          <div className="flex items-center gap-2 px-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] text-slate-500">Systeme operationnel</span>
          </div>
        </div>
      </aside>
    </>
  );
}
