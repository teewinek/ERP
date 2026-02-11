import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign, TrendingUp, ShoppingCart, AlertCircle, Users, FileText,
  Factory, ArrowUpRight, Crown, Truck, Clock, Target, BarChart3, Download,
  Percent, ArrowDownRight, Activity,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend,
} from 'recharts';
import { supabase } from '../lib/supabase';
import { formatCurrency, downloadFile } from '../lib/utils';
import KPICard from '../components/ui/KPICard';
import StatusBadge from '../components/ui/StatusBadge';
import type { Invoice, Expense, ProductionJob, PurchaseOrder } from '../types';

const CHART_COLORS = ['#06c6a9', '#0891b2', '#f59e0b', '#ef4444', '#64748b', '#ec4899', '#8b5cf6', '#10b981'];
const MONTHS = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec'];

interface TopEntity { name: string; total: number; count?: number; }

export default function Dashboard() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [jobs, setJobs] = useState<ProductionJob[]>([]);
  const [purchases, setPurchases] = useState<PurchaseOrder[]>([]);
  const [clientCount, setClientCount] = useState(0);
  const [productCount, setProductCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [invRes, expRes, jobRes, cliRes, poRes, prodRes] = await Promise.all([
      supabase.from('invoices').select('*, clients(name), invoice_items(description, quantity, unit_price)').order('created_at', { ascending: false }),
      supabase.from('expenses').select('*').order('expense_date', { ascending: false }),
      supabase.from('production_jobs').select('*, clients(name)').order('created_at', { ascending: false }).limit(5),
      supabase.from('clients').select('id', { count: 'exact', head: true }),
      supabase.from('purchase_orders').select('*, suppliers(name)').order('created_at', { ascending: false }),
      supabase.from('products').select('id', { count: 'exact', head: true }),
    ]);
    setInvoices(invRes.data || []);
    setExpenses(expRes.data || []);
    setJobs(jobRes.data || []);
    setClientCount(cliRes.count || 0);
    setProductCount(prodRes.count || 0);
    setPurchases(poRes.data || []);
    setLoading(false);
  }

  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
  const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;

  const validatedInvoices = invoices.filter((inv) => inv.status === 'validated' || inv.status === 'paid');

  const caTTC = validatedInvoices.reduce((sum, inv) => sum + Number(inv.total), 0);
  const caHT = validatedInvoices.reduce((sum, inv) => sum + Number(inv.subtotal), 0);

  const caMonth = validatedInvoices
    .filter((inv) => { const d = new Date(inv.created_at); return d.getMonth() === thisMonth && d.getFullYear() === thisYear; })
    .reduce((sum, inv) => sum + Number(inv.total), 0);

  const caLastMonth = validatedInvoices
    .filter((inv) => { const d = new Date(inv.created_at); return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear; })
    .reduce((sum, inv) => sum + Number(inv.total), 0);

  const caGrowth = caLastMonth > 0 ? ((caMonth - caLastMonth) / caLastMonth) * 100 : 0;

  const impayesTotal = invoices
    .filter((inv) => inv.status === 'validated')
    .reduce((sum, inv) => sum + Number(inv.total), 0);

  const achatsTotal = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
  const achatsMonth = expenses
    .filter((exp) => { const d = new Date(exp.expense_date); return d.getMonth() === thisMonth && d.getFullYear() === thisYear; })
    .reduce((sum, exp) => sum + Number(exp.amount), 0);

  const achatsLastMonth = expenses
    .filter((exp) => { const d = new Date(exp.expense_date); return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear; })
    .reduce((sum, exp) => sum + Number(exp.amount), 0);

  const achatsGrowth = achatsLastMonth > 0 ? ((achatsMonth - achatsLastMonth) / achatsLastMonth) * 100 : 0;

  const margebrute = caTTC - achatsTotal;
  const margeBrutePercent = caTTC > 0 ? (margebrute / caTTC) * 100 : 0;
  const resultatNet = caMonth - achatsMonth;

  const panierMoyen = validatedInvoices.length > 0 ? caTTC / validatedInvoices.length : 0;

  const paidInvoices = invoices.filter((inv) => inv.status === 'paid');
  let dsoAvg = 0;
  if (paidInvoices.length > 0) {
    const totalDays = paidInvoices.reduce((sum, inv) => {
      const issue = new Date(inv.issue_date);
      const paid = new Date(inv.updated_at);
      return sum + Math.max(0, (paid.getTime() - issue.getTime()) / (1000 * 60 * 60 * 24));
    }, 0);
    dsoAvg = totalDays / paidInvoices.length;
  }

  const overdueInvoices = invoices.filter((inv) => {
    if (inv.status !== 'validated' || !inv.due_date) return false;
    return new Date(inv.due_date) < now;
  });

  const conversionRate = invoices.length > 0 ? (paidInvoices.length / invoices.length) * 100 : 0;

  const topProducts: TopEntity[] = (() => {
    const productMap: Record<string, { name: string; total: number; count: number }> = {};
    validatedInvoices.forEach((inv) => {
      (inv.invoice_items || []).forEach((item: any) => {
        const name = item.description || 'Inconnu';
        if (!productMap[name]) productMap[name] = { name, total: 0, count: 0 };
        productMap[name].total += Number(item.quantity) * Number(item.unit_price);
        productMap[name].count += Number(item.quantity);
      });
    });
    return Object.values(productMap).sort((a, b) => b.total - a.total).slice(0, 5);
  })();

  const revenueByMonth = MONTHS.map((label, i) => {
    const monthRevenue = validatedInvoices
      .filter((inv) => { const d = new Date(inv.created_at); return d.getMonth() === i && d.getFullYear() === thisYear; })
      .reduce((sum, inv) => sum + Number(inv.total), 0);
    const monthExpenses = expenses
      .filter((exp) => { const d = new Date(exp.expense_date); return d.getMonth() === i && d.getFullYear() === thisYear; })
      .reduce((sum, exp) => sum + Number(exp.amount), 0);
    const monthInvoiceCount = validatedInvoices
      .filter((inv) => { const d = new Date(inv.created_at); return d.getMonth() === i && d.getFullYear() === thisYear; }).length;
    return {
      name: label,
      revenue: monthRevenue,
      depenses: monthExpenses,
      net: monthRevenue - monthExpenses,
      marge: monthRevenue > 0 ? ((monthRevenue - monthExpenses) / monthRevenue) * 100 : 0,
      invoices: monthInvoiceCount,
    };
  });

  const expensesByCategory = expenses.reduce<Record<string, number>>((acc, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + Number(exp.amount);
    return acc;
  }, {});
  const pieData = Object.entries(expensesByCategory).map(([name, value]) => ({ name, value }));

  const topClients: TopEntity[] = Object.values(
    validatedInvoices.reduce<Record<string, TopEntity>>((acc, inv) => {
      const name = inv.clients?.name || 'Inconnu';
      if (!acc[name]) acc[name] = { name, total: 0, count: 0 };
      acc[name].total += Number(inv.total);
      acc[name].count = (acc[name].count || 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b.total - a.total).slice(0, 5);

  const topSuppliers: TopEntity[] = Object.values(
    purchases.reduce<Record<string, TopEntity>>((acc, po) => {
      const name = po.suppliers?.name || 'Inconnu';
      if (!acc[name]) acc[name] = { name, total: 0, count: 0 };
      acc[name].total += Number(po.total);
      acc[name].count = (acc[name].count || 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b.total - a.total).slice(0, 5);

  const recentInvoices = invoices.slice(0, 5);

  function exportDashboardCSV() {
    const header = 'Mois,Revenue,Depenses,Net,Marge %,Nb Factures\n';
    const rows = revenueByMonth.map((m) => `${m.name},${m.revenue.toFixed(3)},${m.depenses.toFixed(3)},${m.net.toFixed(3)},${m.marge.toFixed(2)},${m.invoices}`).join('\n');
    downloadFile(header + rows, `dashboard-${thisYear}.csv`, 'text/csv');
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tableau de bord</h1>
          <p className="text-sm text-slate-500 mt-0.5">Analyse complete de votre activite commerciale</p>
        </div>
        <button onClick={exportDashboardCSV} className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-sm text-slate-700 hover:bg-slate-50 transition-colors">
          <Download size={16} />
          Export CSV
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="CA du mois (TTC)"
          value={formatCurrency(caMonth)}
          subtitle={caGrowth >= 0 ? `+${caGrowth.toFixed(1)}% vs mois dernier` : `${caGrowth.toFixed(1)}% vs mois dernier`}
          icon={<DollarSign size={20} className="text-white" />}
          color="bg-brand-500"
        />
        <KPICard
          title="Impayes"
          value={formatCurrency(impayesTotal)}
          subtitle={`${invoices.filter((i) => i.status === 'validated').length} factures`}
          icon={<AlertCircle size={20} className="text-white" />}
          color="bg-amber-500"
        />
        <KPICard
          title="Depenses du mois"
          value={formatCurrency(achatsMonth)}
          subtitle={achatsGrowth >= 0 ? `+${achatsGrowth.toFixed(1)}% vs mois dernier` : `${achatsGrowth.toFixed(1)}% vs mois dernier`}
          icon={<ShoppingCart size={20} className="text-white" />}
          color="bg-cyan-600"
        />
        <KPICard
          title="Resultat net"
          value={formatCurrency(resultatNet)}
          subtitle={`Marge: ${margeBrutePercent.toFixed(1)}%`}
          icon={<TrendingUp size={20} className="text-white" />}
          color={resultatNet >= 0 ? 'bg-emerald-500' : 'bg-red-500'}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-2">
            <Target size={14} className="text-emerald-500" />
            <span className="text-xs text-slate-500">Marge brute</span>
          </div>
          <p className="text-lg font-bold text-slate-900">{formatCurrency(margebrute)}</p>
          <p className="text-xs text-emerald-600 font-medium mt-0.5">{margeBrutePercent.toFixed(1)}%</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 size={14} className="text-teal-500" />
            <span className="text-xs text-slate-500">Panier moyen</span>
          </div>
          <p className="text-lg font-bold text-slate-900">{formatCurrency(panierMoyen)}</p>
          <p className="text-xs text-slate-500 mt-0.5">{validatedInvoices.length} ventes</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={14} className="text-amber-500" />
            <span className="text-xs text-slate-500">DSO moyen</span>
          </div>
          <p className="text-lg font-bold text-slate-900">{dsoAvg.toFixed(0)} j</p>
          <p className="text-xs text-slate-500 mt-0.5">Delai paiement</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle size={14} className="text-red-500" />
            <span className="text-xs text-slate-500">Retards</span>
          </div>
          <p className="text-lg font-bold text-red-600">{overdueInvoices.length}</p>
          <p className="text-xs text-red-500 mt-0.5">{formatCurrency(overdueInvoices.reduce((s, i) => s + Number(i.total), 0))}</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-2">
            <Percent size={14} className="text-blue-500" />
            <span className="text-xs text-slate-500">Taux conversion</span>
          </div>
          <p className="text-lg font-bold text-slate-900">{conversionRate.toFixed(1)}%</p>
          <p className="text-xs text-slate-500 mt-0.5">{paidInvoices.length}/{invoices.length} payees</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-2">
            <Activity size={14} className="text-purple-500" />
            <span className="text-xs text-slate-500">CA Total (HT)</span>
          </div>
          <p className="text-lg font-bold text-slate-900">{formatCurrency(caHT)}</p>
          <p className="text-xs text-slate-500 mt-0.5">Hors taxes</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Performance financiere</h3>
              <p className="text-xs text-slate-500 mt-0.5">Revenue, depenses et marge nette ({thisYear})</p>
            </div>
            <div className="flex gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-brand-500"></div>
                <span className="text-slate-600">Revenue</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-slate-600">Depenses</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                <span className="text-slate-600">Net</span>
              </div>
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueByMonth}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06c6a9" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#06c6a9" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number | undefined) => formatCurrency(value ?? 0)}
                />
                <Area type="monotone" dataKey="revenue" stroke="#06c6a9" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRev)" name="Revenue" />
                <Area type="monotone" dataKey="depenses" stroke="#ef4444" strokeWidth={2.5} fillOpacity={1} fill="url(#colorExp)" name="Depenses" />
                <Area type="monotone" dataKey="net" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorNet)" name="Net" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="mb-5">
            <h3 className="text-base font-semibold text-slate-900">Repartition des depenses</h3>
            <p className="text-xs text-slate-500 mt-0.5">Par categorie</p>
          </div>
          {pieData.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-sm text-slate-400">Aucune depense</div>
          ) : (
            <>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.map((_, index) => (
                        <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                      formatter={(value: number | undefined) => formatCurrency(value ?? 0)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 space-y-2">
                {pieData.slice(0, 5).map((item, i) => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                      <span className="text-slate-600 font-medium">{item.name}</span>
                    </div>
                    <span className="font-semibold text-slate-800">{formatCurrency(item.value)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Evolution mensuelle</h3>
            <p className="text-xs text-slate-500 mt-0.5">Analyse detaillee par mois ({thisYear})</p>
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenueByMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                formatter={(value: number | undefined) => formatCurrency(value ?? 0)}
              />
              <Legend
                wrapperStyle={{ fontSize: 12, paddingTop: 20 }}
                iconType="circle"
              />
              <Bar dataKey="revenue" name="Revenue" radius={[6, 6, 0, 0]} fill="#06c6a9" />
              <Bar dataKey="depenses" name="Depenses" radius={[6, 6, 0, 0]} fill="#ef4444" />
              <Bar dataKey="net" name="Net" radius={[6, 6, 0, 0]} fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-4">
            <Crown size={16} className="text-amber-500" />
            <h3 className="text-sm font-semibold text-slate-900">Top Clients</h3>
          </div>
          {topClients.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">Aucune donnee</div>
          ) : (
            <div className="space-y-3">
              {topClients.map((c, i) => (
                <div key={c.name} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center text-[10px] font-bold shadow-sm">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm text-slate-700 font-medium truncate max-w-[120px]">{c.name}</p>
                      <p className="text-[10px] text-slate-500">{c.count} factures</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-900">{formatCurrency(c.total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingCart size={16} className="text-blue-500" />
            <h3 className="text-sm font-semibold text-slate-900">Top Articles</h3>
          </div>
          {topProducts.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">Aucune donnee</div>
          ) : (
            <div className="space-y-3">
              {topProducts.map((p, i) => (
                <div key={p.name} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-white flex items-center justify-center text-[10px] font-bold shadow-sm">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm text-slate-700 font-medium truncate max-w-[120px]">{p.name}</p>
                      <p className="text-[10px] text-slate-500">{p.count} unites</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-900">{formatCurrency(p.total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-4">
            <Truck size={16} className="text-cyan-500" />
            <h3 className="text-sm font-semibold text-slate-900">Top Fournisseurs</h3>
          </div>
          {topSuppliers.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">Aucune donnee</div>
          ) : (
            <div className="space-y-3">
              {topSuppliers.map((s, i) => (
                <div key={s.name} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-600 text-white flex items-center justify-center text-[10px] font-bold shadow-sm">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm text-slate-700 font-medium truncate max-w-[120px]">{s.name}</p>
                      <p className="text-[10px] text-slate-500">{s.count} commandes</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-900">{formatCurrency(s.total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-900">Production en cours</h3>
            <span className="text-xs text-slate-400">{jobs.length} travaux</span>
          </div>
          {jobs.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">Aucun travail</div>
          ) : (
            <div className="space-y-2">
              {jobs.map((job) => (
                <div key={job.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors">
                  <div>
                    <p className="text-xs font-medium text-slate-800">{job.title}</p>
                    <p className="text-[10px] text-slate-500">{job.job_number}</p>
                  </div>
                  <StatusBadge status={job.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {overdueInvoices.length > 0 && (
        <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl border border-red-200 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle size={18} className="text-red-600" />
            <h3 className="text-base font-semibold text-red-900">Factures en retard ({overdueInvoices.length})</h3>
            <span className="ml-auto text-sm font-bold text-red-700">{formatCurrency(overdueInvoices.reduce((s, i) => s + Number(i.total), 0))}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {overdueInvoices.slice(0, 6).map((inv) => {
              const daysLate = Math.floor((now.getTime() - new Date(inv.due_date!).getTime()) / (1000 * 60 * 60 * 24));
              return (
                <div key={inv.id} onClick={() => navigate(`/invoices/${inv.id}`)}
                  className="bg-white p-4 rounded-xl cursor-pointer hover:shadow-md transition-all border border-red-100 hover:border-red-300">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{inv.invoice_number}</p>
                      <p className="text-xs text-slate-500">{inv.clients?.name}</p>
                    </div>
                    <span className="px-2 py-1 text-[10px] font-bold text-red-700 bg-red-100 rounded-full">{daysLate}j</span>
                  </div>
                  <p className="text-base font-bold text-red-700">{formatCurrency(Number(inv.total))}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Dernieres factures</h3>
              <p className="text-xs text-slate-500 mt-0.5">{invoices.length} factures au total</p>
            </div>
          </div>
          {recentInvoices.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">Aucune facture</div>
          ) : (
            <div className="space-y-2">
              {recentInvoices.map((inv) => (
                <div key={inv.id} onClick={() => navigate(`/invoices/${inv.id}`)}
                  className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer border border-transparent hover:border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-sm">
                      <FileText size={18} className="text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{inv.invoice_number}</p>
                      <p className="text-xs text-slate-500">{inv.clients?.name || 'Client inconnu'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-900">{formatCurrency(Number(inv.total))}</p>
                    <StatusBadge status={inv.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 content-start">
          <div className="bg-gradient-to-br from-brand-50 to-teal-50 rounded-2xl border border-brand-100 p-5 text-center shadow-sm hover:shadow-md transition-shadow">
            <Users size={24} className="text-brand-600 mx-auto mb-3" />
            <p className="text-3xl font-bold text-slate-900">{clientCount}</p>
            <p className="text-xs text-slate-600 font-medium mt-1">Clients actifs</p>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl border border-blue-100 p-5 text-center shadow-sm hover:shadow-md transition-shadow">
            <FileText size={24} className="text-blue-600 mx-auto mb-3" />
            <p className="text-3xl font-bold text-slate-900">{invoices.length}</p>
            <p className="text-xs text-slate-600 font-medium mt-1">Factures emises</p>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-100 p-5 text-center shadow-sm hover:shadow-md transition-shadow">
            <Factory size={24} className="text-amber-600 mx-auto mb-3" />
            <p className="text-3xl font-bold text-slate-900">{productCount}</p>
            <p className="text-xs text-slate-600 font-medium mt-1">Produits catalogue</p>
          </div>

          <div className={`bg-gradient-to-br ${resultatNet >= 0 ? 'from-emerald-50 to-green-50 border-emerald-100' : 'from-red-50 to-pink-50 border-red-100'} rounded-2xl border p-5 text-center shadow-sm hover:shadow-md transition-shadow`}>
            {resultatNet >= 0 ? (
              <ArrowUpRight size={24} className="text-emerald-600 mx-auto mb-3" />
            ) : (
              <ArrowDownRight size={24} className="text-red-600 mx-auto mb-3" />
            )}
            <p className="text-3xl font-bold text-slate-900">{conversionRate.toFixed(0)}%</p>
            <p className="text-xs text-slate-600 font-medium mt-1">Taux conversion</p>
          </div>
        </div>
      </div>
    </div>
  );
}
