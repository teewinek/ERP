import { type ReactNode } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  change?: number;
  icon: ReactNode;
  color: string;
}

export default function KPICard({ title, value, subtitle, change, icon, color }: KPICardProps) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 hover:shadow-lg transition-all duration-300 group">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="text-2xl font-bold text-slate-900 tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
          {change !== undefined && (
            <div className={`flex items-center gap-1 text-xs font-medium ${change >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {change >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              <span>{change >= 0 ? '+' : ''}{change.toFixed(1)}%</span>
              <span className="text-slate-400 ml-1">vs mois dernier</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-xl ${color} transition-transform duration-300 group-hover:scale-110`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
