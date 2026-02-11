import { useEffect, useState } from 'react';
import {
  User, Building2, Zap, DollarSign, FileText, Plug, Shield,
  Save, Check
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { validateCompanyForTEJ } from '../lib/utils';
import type { UserProfile, CompanySettings, TaxRule } from '../types';

type TabId = 'profile' | 'company' | 'ttn' | 'taxes' | 'documents' | 'integrations';

const TABS = [
  { id: 'profile' as TabId, label: 'Profil', icon: User },
  { id: 'company' as TabId, label: 'Entreprise', icon: Building2 },
  { id: 'ttn' as TabId, label: 'Facturation Électronique', icon: Zap },
  { id: 'taxes' as TabId, label: 'Taxes', icon: DollarSign },
  { id: 'documents' as TabId, label: 'Documents', icon: FileText },
  { id: 'integrations' as TabId, label: 'Intégrations', icon: Plug },
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState<TabId>('profile');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [company, setCompany] = useState<CompanySettings | null>(null);
  const [taxRules, setTaxRules] = useState<TaxRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const [profileForm, setProfileForm] = useState({ full_name: '', email: '' });
  const [companyForm, setCompanyForm] = useState({
    company_name: '',
    company_address: '',
    company_city: '',
    company_phone: '',
    company_email: '',
    company_tax_id: '',
    company_logo_url: '',
    cachet_url: '',
  });
  const [ttnForm, setTtnForm] = useState({
    ttn_enabled: false,
    trust_id: '',
    digigo_config: {},
  });
  const [docForm, setDocForm] = useState({
    invoice_prefix: 'FAC',
    quote_prefix: 'DEV',
    po_prefix: 'BC',
    dn_prefix: 'BL',
    rn_prefix: 'BR',
    cn_prefix: 'AV',
    so_prefix: 'CMD',
    show_qr_code: false,
    decimals: 3 as 2 | 3,
    invoice_template: 'pro' as 'free' | 'pro' | 'teewinek',
    default_fodec_rate: 0,
    default_timbre: 0,
    pdf_footer: '',
    pdf_conditions: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [profRes, csRes, taxRes] = await Promise.all([
      supabase.from('user_profiles').select('*').eq('id', user.id).maybeSingle(),
      supabase.from('company_settings').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('tax_rules').select('*').order('created_at'),
    ]);

    if (profRes.data) {
      setProfile(profRes.data);
      setProfileForm({
        full_name: profRes.data.full_name || '',
        email: user.email || '',
      });
    }

    if (csRes.data) {
      setCompany(csRes.data);
      setCompanyForm({
        company_name: csRes.data.company_name || '',
        company_address: csRes.data.company_address || '',
        company_city: csRes.data.company_city || '',
        company_phone: csRes.data.company_phone || '',
        company_email: csRes.data.company_email || '',
        company_tax_id: csRes.data.company_tax_id || '',
        company_logo_url: csRes.data.company_logo_url || '',
        cachet_url: csRes.data.cachet_url || '',
      });
      setTtnForm({
        ttn_enabled: csRes.data.ttn_enabled || false,
        trust_id: csRes.data.trust_id || '',
        digigo_config: csRes.data.digigo_config || {},
      });
      setDocForm({
        invoice_prefix: csRes.data.invoice_prefix || 'FAC',
        quote_prefix: csRes.data.quote_prefix || 'DEV',
        po_prefix: csRes.data.po_prefix || 'BC',
        dn_prefix: csRes.data.dn_prefix || 'BL',
        rn_prefix: csRes.data.rn_prefix || 'BR',
        cn_prefix: csRes.data.cn_prefix || 'AV',
        so_prefix: csRes.data.so_prefix || 'CMD',
        show_qr_code: csRes.data.show_qr_code || false,
        decimals: csRes.data.decimals || 3,
        invoice_template: csRes.data.invoice_template || 'pro',
        default_fodec_rate: csRes.data.default_fodec_rate || 0,
        default_timbre: csRes.data.default_timbre || 0,
        pdf_footer: csRes.data.pdf_footer || '',
        pdf_conditions: csRes.data.pdf_conditions || '',
      });
    }

    setTaxRules(taxRes.data || []);
    setLoading(false);
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    await supabase.from('user_profiles').update({ full_name: profileForm.full_name }).eq('id', profile.id);
    setSaving(false);
    setMessage('Profil mis à jour');
    setTimeout(() => setMessage(''), 3000);
    loadData();
  }

  async function saveCompany(e: React.FormEvent) {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const errors = validateCompanyForTEJ(companyForm);
    if (errors.length > 0) {
      setMessage('Erreur: ' + errors[0].message);
      setTimeout(() => setMessage(''), 5000);
      return;
    }

    setSaving(true);
    if (company) {
      await supabase.from('company_settings').update(companyForm).eq('id', company.id);
    } else {
      await supabase.from('company_settings').insert({ ...companyForm, user_id: user.id });
    }
    setSaving(false);
    setMessage('Entreprise mise à jour');
    setTimeout(() => setMessage(''), 3000);
    loadData();
  }

  async function saveTTN(e: React.FormEvent) {
    e.preventDefault();
    if (!company) return;
    setSaving(true);
    await supabase.from('company_settings').update(ttnForm).eq('id', company.id);
    setSaving(false);
    setMessage('Paramètres TTN mis à jour');
    setTimeout(() => setMessage(''), 3000);
    loadData();
  }

  async function saveDocuments(e: React.FormEvent) {
    e.preventDefault();
    if (!company) return;
    setSaving(true);
    await supabase.from('company_settings').update(docForm).eq('id', company.id);
    setSaving(false);
    setMessage('Paramètres documents mis à jour');
    setTimeout(() => setMessage(''), 3000);
    loadData();
  }

  async function toggleTaxRule(taxId: string, isActive: boolean) {
    await supabase.from('tax_rules').update({ is_active: !isActive }).eq('id', taxId);
    loadData();
  }

  async function addTaxRule(e: React.FormEvent) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    await supabase.from('tax_rules').insert({
      name: formData.get('name') as string,
      rate: Number(formData.get('rate')),
      type: formData.get('type') as string,
      is_active: true,
      is_default: false,
    });

    form.reset();
    loadData();
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
        <h1 className="text-2xl font-bold text-slate-900">Paramètres</h1>
        <p className="text-slate-600 mt-1">Gérez votre compte, entreprise et paramètres de l'application</p>
      </div>

      {message && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
          <Check className="w-5 h-5 text-emerald-600" />
          <p className="text-emerald-700">{message}</p>
        </div>
      )}

      <div className="flex gap-4">
        <div className="w-64 bg-white rounded-2xl shadow-sm border border-slate-200 p-4 h-fit">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-2 transition-all ${
                  activeTab === tab.id
                    ? 'bg-brand-50 text-brand-700 font-medium'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          {activeTab === 'profile' && (
            <div>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Profil</h2>
              <form onSubmit={saveProfile} className="space-y-4 max-w-2xl">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nom complet</label>
                  <input
                    type="text"
                    value={profileForm.full_name}
                    onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={profileForm.email}
                    disabled
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'company' && (
            <div>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Paramètres de l'Entreprise</h2>
              <form onSubmit={saveCompany} className="space-y-4 max-w-2xl">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Nom de la société *
                    </label>
                    <input
                      type="text"
                      value={companyForm.company_name}
                      onChange={(e) => setCompanyForm({ ...companyForm, company_name: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Matricule fiscal * (ex: 1234567A)
                    </label>
                    <input
                      type="text"
                      value={companyForm.company_tax_id}
                      onChange={(e) => setCompanyForm({ ...companyForm, company_tax_id: e.target.value })}
                      placeholder="1234567A"
                      pattern="[0-9]{7}[A-Za-z]"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                    <input
                      type="email"
                      value={companyForm.company_email}
                      onChange={(e) => setCompanyForm({ ...companyForm, company_email: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Téléphone *</label>
                    <input
                      type="tel"
                      value={companyForm.company_phone}
                      onChange={(e) => setCompanyForm({ ...companyForm, company_phone: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Ville</label>
                    <input
                      type="text"
                      value={companyForm.company_city}
                      onChange={(e) => setCompanyForm({ ...companyForm, company_city: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Adresse</label>
                    <textarea
                      value={companyForm.company_address}
                      onChange={(e) => setCompanyForm({ ...companyForm, company_address: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Logo URL</label>
                    <input
                      type="url"
                      value={companyForm.company_logo_url}
                      onChange={(e) => setCompanyForm({ ...companyForm, company_logo_url: e.target.value })}
                      placeholder="https://..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Cachet URL</label>
                    <input
                      type="url"
                      value={companyForm.cachet_url}
                      onChange={(e) => setCompanyForm({ ...companyForm, cachet_url: e.target.value })}
                      placeholder="https://..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'ttn' && (
            <div>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Facturation Électronique (TTN)</h2>
              <form onSubmit={saveTTN} className="space-y-4 max-w-2xl">
                <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
                  <input
                    type="checkbox"
                    id="ttn_enabled"
                    checked={ttnForm.ttn_enabled}
                    onChange={(e) => setTtnForm({ ...ttnForm, ttn_enabled: e.target.checked })}
                    className="w-5 h-5 text-brand-600 rounded focus:ring-brand-500"
                  />
                  <label htmlFor="ttn_enabled" className="text-sm font-medium text-blue-900">
                    Activez cette option pour envoyer vos factures à la plateforme TTN
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">TRUST ID (Clé USB)</label>
                  <input
                    type="text"
                    value={ttnForm.trust_id}
                    onChange={(e) => setTtnForm({ ...ttnForm, trust_id: e.target.value })}
                    placeholder="Entrez votre TRUST ID"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-sm text-amber-800">
                    La configuration Digigo sera stockée de manière sécurisée et chiffrée
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'taxes' && (
            <div>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Taxes</h2>

              <div className="mb-6">
                <h3 className="font-semibold text-slate-900 mb-3">Taxes configurées</h3>
                <div className="space-y-2">
                  {taxRules.map((tax) => (
                    <div key={tax.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={tax.is_active}
                          onChange={() => toggleTaxRule(tax.id, tax.is_active)}
                          className="w-4 h-4 text-brand-600 rounded"
                        />
                        <div>
                          <p className="font-medium text-slate-900">{tax.name}</p>
                          <p className="text-sm text-slate-600">{tax.rate}% - {tax.type.toUpperCase()}</p>
                        </div>
                      </div>
                      {tax.is_default && (
                        <span className="px-2 py-1 bg-brand-100 text-brand-700 text-xs rounded">Par défaut</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="font-semibold text-slate-900 mb-3">Ajouter une taxe</h3>
                <form onSubmit={addTaxRule} className="space-y-4 max-w-2xl">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Nom</label>
                      <input
                        type="text"
                        name="name"
                        placeholder="Ex: TVA 7%"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Taux (%)</label>
                      <input
                        type="number"
                        name="rate"
                        placeholder="7"
                        step="0.01"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                      <select
                        name="type"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                        required
                      >
                        <option value="tva">TVA</option>
                        <option value="fodec">FODEC</option>
                        <option value="other">Autre</option>
                      </select>
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700"
                  >
                    <Save className="w-4 h-4" />
                    Ajouter
                  </button>
                </form>
              </div>

              <div className="mt-6 border-t pt-6">
                <h3 className="font-semibold text-slate-900 mb-3">Règles d'arrondi</h3>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={docForm.decimals === 2}
                      onChange={() => setDocForm({ ...docForm, decimals: 2 })}
                      className="text-brand-600"
                    />
                    <span className="text-sm">2 décimales</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={docForm.decimals === 3}
                      onChange={() => setDocForm({ ...docForm, decimals: 3 })}
                      className="text-brand-600"
                    />
                    <span className="text-sm">3 décimales</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'documents' && (
            <div>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Paramètres des Documents</h2>
              <form onSubmit={saveDocuments} className="space-y-6 max-w-2xl">
                <div>
                  <h3 className="font-semibold text-slate-900 mb-3">Numérotation</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Préfixe Factures</label>
                      <input
                        type="text"
                        value={docForm.invoice_prefix}
                        onChange={(e) => setDocForm({ ...docForm, invoice_prefix: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Préfixe Devis</label>
                      <input
                        type="text"
                        value={docForm.quote_prefix}
                        onChange={(e) => setDocForm({ ...docForm, quote_prefix: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Préfixe Bons Livraison</label>
                      <input
                        type="text"
                        value={docForm.dn_prefix}
                        onChange={(e) => setDocForm({ ...docForm, dn_prefix: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Préfixe Commandes</label>
                      <input
                        type="text"
                        value={docForm.so_prefix}
                        onChange={(e) => setDocForm({ ...docForm, so_prefix: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Préfixe Avoirs</label>
                      <input
                        type="text"
                        value={docForm.cn_prefix}
                        onChange={(e) => setDocForm({ ...docForm, cn_prefix: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Préfixe Retours</label>
                      <input
                        type="text"
                        value={docForm.rn_prefix}
                        onChange={(e) => setDocForm({ ...docForm, rn_prefix: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-slate-900 mb-3">Valeurs par defaut factures</h3>
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Modele facture</label>
                      <select
                        value={docForm.invoice_template}
                        onChange={(e) => setDocForm({ ...docForm, invoice_template: e.target.value as 'free' | 'pro' | 'teewinek' })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                      >
                        <option value="pro">Pro</option>
                        <option value="teewinek">Teewinek (Style premium)</option>
                        <option value="free">Free (simplifie)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">FODEC par defaut (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={docForm.default_fodec_rate}
                        onChange={(e) => setDocForm({ ...docForm, default_fodec_rate: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Timbre par defaut (DT)</label>
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        value={docForm.default_timbre}
                        onChange={(e) => setDocForm({ ...docForm, default_timbre: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-slate-900 mb-3">Options PDF</h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="show_qr_code"
                        checked={docForm.show_qr_code}
                        onChange={(e) => setDocForm({ ...docForm, show_qr_code: e.target.checked })}
                        className="w-4 h-4 text-brand-600 rounded"
                      />
                      <label htmlFor="show_qr_code" className="text-sm font-medium text-slate-700">
                        Afficher QR Code sur les documents
                      </label>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Pied de page</label>
                      <textarea
                        value={docForm.pdf_footer}
                        onChange={(e) => setDocForm({ ...docForm, pdf_footer: e.target.value })}
                        rows={2}
                        placeholder="Ex: Merci pour votre confiance"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Conditions générales</label>
                      <textarea
                        value={docForm.pdf_conditions}
                        onChange={(e) => setDocForm({ ...docForm, pdf_conditions: e.target.value })}
                        rows={3}
                        placeholder="Conditions générales de vente..."
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'integrations' && (
            <div>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Intégrations</h2>
              <div className="space-y-4">
                <div className="p-4 border border-slate-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <Plug className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">Webhooks</p>
                        <p className="text-sm text-slate-600">Recevez des notifications en temps réel</p>
                      </div>
                    </div>
                    <button className="px-3 py-1 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">
                      Configurer
                    </button>
                  </div>
                </div>

                <div className="p-4 border border-slate-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                        <Shield className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">API Keys</p>
                        <p className="text-sm text-slate-600">Gérez vos clés d'API sécurisées</p>
                      </div>
                    </div>
                    <button className="px-3 py-1 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">
                      Gérer
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
