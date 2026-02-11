import { useState, useEffect } from 'react';
import { Download, AlertCircle, CheckCircle, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PurchaseOrder } from '../types';
import { formatCurrency, validateCompanyForTEJ, exportTEJCSV, exportTEJXML, downloadFile } from '../lib/utils';
import { CompanySettings } from '../types';

export default function TEJExport() {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [purchases, setPurchases] = useState<PurchaseOrder[]>([]);
  const [, setCompanySettings] = useState<CompanySettings | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [exportHistory, setExportHistory] = useState<any[]>([]);

  useEffect(() => {
    fetchCompanySettings();
    fetchExportHistory();
  }, []);

  useEffect(() => {
    if (month && year) {
      fetchPurchasesForMonth();
    }
  }, [month, year]);

  async function fetchCompanySettings() {
    const { data } = await supabase.from('company_settings').select('*').single();
    if (data) {
      setCompanySettings(data);
      validateCompany(data);
    }
  }

  async function fetchExportHistory() {
    const { data } = await supabase
      .from('tej_exports')
      .select('*')
      .order('export_date', { ascending: false })
      .limit(10);

    if (data) {
      setExportHistory(data);
    }
  }

  function validateCompany(settings: CompanySettings) {
    const errors = validateCompanyForTEJ({
      company_name: settings.company_name,
      company_tax_id: settings.company_tax_id,
      company_email: settings.company_email,
      company_phone: settings.company_phone,
    });

    if (errors.length > 0) {
      setValidationErrors(errors.map((e) => e.message));
    } else {
      setValidationErrors([]);
    }
  }

  async function fetchPurchasesForMonth() {
    setLoading(true);

    const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    const { data } = await supabase
      .from('purchase_orders')
      .select(`
        *,
        suppliers (*)
      `)
      .gte('order_date', startDate)
      .lte('order_date', endDate)
      .gte('total', 1000);

    if (data) {
      setPurchases(data.filter((p) => p.retenue_source > 0));
    }

    setLoading(false);
  }

  const totalRetenue = purchases.reduce((sum, p) => sum + p.retenue_source, 0);

  async function handleExport(format: 'csv' | 'xml') {
    if (validationErrors.length > 0) {
      alert('Veuillez corriger les erreurs de validation de la société avant d\'exporter.');
      return;
    }

    const exportData = purchases.map((p) => ({
      po_number: p.po_number,
      order_date: p.order_date,
      supplier_name: p.suppliers?.name || '',
      supplier_tax_id: p.suppliers?.tax_id || '',
      total: p.total,
      retenue_source: p.retenue_source,
    }));

    const content = format === 'csv' ? exportTEJCSV(exportData) : exportTEJXML(exportData);
    const filename = `TEJ_${year}_${String(month).padStart(2, '0')}.${format}`;

    downloadFile(content, filename, format === 'csv' ? 'text/csv' : 'application/xml');

    await supabase.from('tej_exports').insert({
      month,
      year,
      total_retenue: totalRetenue,
      line_count: purchases.length,
    });

    fetchExportHistory();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Export TEJ Mensuel</h1>
        <p className="text-slate-600 mt-1">Exportez les retenues à la source vers la plateforme TEJ</p>
      </div>

      {validationErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-900 mb-2">Validation de la société échouée</h3>
              <ul className="space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index} className="text-sm text-red-700">
                    • {error}
                  </li>
                ))}
              </ul>
              <p className="text-sm text-red-600 mt-3">
                Veuillez corriger ces informations dans Paramètres → Entreprise avant d'exporter.
              </p>
            </div>
          </div>
        </div>
      )}

      {validationErrors.length === 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <p className="text-sm text-emerald-700 font-medium">
              Société validée. Vous pouvez exporter les données TEJ.
            </p>
          </div>
        </div>
      )}

      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Sélection de la période</h2>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Mois</label>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(2000, i).toLocaleString('fr-FR', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Année</label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {Array.from({ length: 5 }, (_, i) => {
                const y = new Date().getFullYear() - i;
                return (
                  <option key={y} value={y}>
                    {y}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8 text-slate-500">Chargement...</div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-xl">
                <p className="text-sm text-blue-600 mb-1">Nombre d'achats</p>
                <p className="text-2xl font-bold text-blue-900">{purchases.length}</p>
              </div>
              <div className="bg-amber-50 p-4 rounded-xl">
                <p className="text-sm text-amber-600 mb-1">Total retenues</p>
                <p className="text-2xl font-bold text-amber-900">{formatCurrency(totalRetenue)}</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-xl">
                <p className="text-sm text-purple-600 mb-1">Période</p>
                <p className="text-lg font-bold text-purple-900">
                  {new Date(year, month - 1).toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>

            {purchases.length > 0 && (
              <div className="space-y-3 mb-6">
                <h3 className="font-semibold text-slate-900">Achats concernés</h3>
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        <th className="text-left py-2 px-3 font-medium text-slate-700">Numéro</th>
                        <th className="text-left py-2 px-3 font-medium text-slate-700">Fournisseur</th>
                        <th className="text-left py-2 px-3 font-medium text-slate-700">MF</th>
                        <th className="text-right py-2 px-3 font-medium text-slate-700">TTC</th>
                        <th className="text-right py-2 px-3 font-medium text-slate-700">RS 1%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {purchases.map((purchase) => (
                        <tr key={purchase.id} className="border-b border-slate-100">
                          <td className="py-2 px-3">{purchase.po_number}</td>
                          <td className="py-2 px-3">{purchase.suppliers?.name}</td>
                          <td className="py-2 px-3 text-slate-600">{purchase.suppliers?.tax_id}</td>
                          <td className="py-2 px-3 text-right">{formatCurrency(purchase.total)}</td>
                          <td className="py-2 px-3 text-right font-medium text-brand-600">
                            {formatCurrency(purchase.retenue_source)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => handleExport('csv')}
                disabled={purchases.length === 0 || validationErrors.length > 0}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-5 h-5" />
                Exporter CSV
              </button>
              <button
                onClick={() => handleExport('xml')}
                disabled={purchases.length === 0 || validationErrors.length > 0}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-5 h-5" />
                Exporter XML
              </button>
            </div>
          </>
        )}
      </div>

      {exportHistory.length > 0 && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Historique des exports</h2>
          <div className="space-y-2">
            {exportHistory.map((exp) => (
              <div
                key={exp.id}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="font-medium text-slate-900">
                      {new Date(exp.year, exp.month - 1).toLocaleString('fr-FR', {
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                    <p className="text-sm text-slate-600">
                      {exp.line_count} achats • {formatCurrency(exp.total_retenue)} retenues
                    </p>
                  </div>
                </div>
                <p className="text-sm text-slate-500">
                  {new Date(exp.export_date).toLocaleDateString('fr-FR')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
