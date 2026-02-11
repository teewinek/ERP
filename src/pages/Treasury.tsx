import { useState, useEffect } from 'react';
import { Plus, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { TreasuryTransaction } from '../types';
import { formatCurrency, formatDate } from '../lib/utils';
import Modal from '../components/ui/Modal';

const CATEGORIES = [
  'Ventes',
  'Achats',
  'Loyer',
  'Salaires',
  'Charges',
  'Investissement',
  'Remboursement',
  'Autre',
];

const ACCOUNTS = ['Caisse', 'Banque Principale', 'Banque Secondaire', 'Chèques'];

export default function Treasury() {
  const [transactions, setTransactions] = useState<TreasuryTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState('');

  useEffect(() => {
    fetchTransactions();
  }, []);

  async function fetchTransactions() {
    setLoading(true);
    const { data, error } = await supabase
      .from('treasury_transactions')
      .select('*')
      .order('transaction_date', { ascending: false });

    if (!error && data) {
      setTransactions(data);
    }
    setLoading(false);
  }

  const accountBalances = ACCOUNTS.map((account) => {
    const accountTxs = selectedAccount
      ? transactions.filter((t) => t.account_name === selectedAccount)
      : transactions.filter((t) => t.account_name === account);

    const income = accountTxs
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const expense = accountTxs
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      account: selectedAccount || account,
      balance: income - expense,
      income,
      expense,
    };
  });

  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const filteredTxs = selectedAccount
    ? transactions.filter((t) => t.account_name === selectedAccount)
    : transactions;

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
          <h1 className="text-2xl font-bold text-slate-900">Trésorerie</h1>
          <p className="text-slate-600 mt-1">Gérez vos flux de trésorerie</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-brand-500 to-brand-600 text-white rounded-xl hover:from-brand-600 hover:to-brand-700 transition-all"
        >
          <Plus className="w-5 h-5" />
          Nouvelle Transaction
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 rounded-2xl text-white">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-6 h-6" />
            <p className="text-emerald-100">Total Entrées</p>
          </div>
          <p className="text-3xl font-bold">{formatCurrency(totalIncome)}</p>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 p-6 rounded-2xl text-white">
          <div className="flex items-center gap-3 mb-2">
            <TrendingDown className="w-6 h-6" />
            <p className="text-red-100">Total Sorties</p>
          </div>
          <p className="text-3xl font-bold">{formatCurrency(totalExpense)}</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-2xl text-white">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="w-6 h-6" />
            <p className="text-blue-100">Solde Net</p>
          </div>
          <p className="text-3xl font-bold">{formatCurrency(totalIncome - totalExpense)}</p>
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Soldes par compte</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {accountBalances.map((acc) => (
            <button
              key={acc.account}
              onClick={() => setSelectedAccount(selectedAccount === acc.account ? '' : acc.account)}
              className={`p-4 rounded-xl border-2 transition-all ${
                selectedAccount === acc.account
                  ? 'border-brand-500 bg-brand-50'
                  : 'border-slate-200 hover:border-brand-300'
              }`}
            >
              <p className="text-sm text-slate-600 mb-1">{acc.account}</p>
              <p className={`text-xl font-bold ${acc.balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {formatCurrency(acc.balance)}
              </p>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Transactions{selectedAccount && ` - ${selectedAccount}`}
        </h2>
        {filteredTxs.length === 0 ? (
          <div className="text-center py-8 text-slate-500">Aucune transaction</div>
        ) : (
          <div className="space-y-2">
            {filteredTxs.slice(0, 50).map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    {tx.type === 'income' ? (
                      <TrendingUp className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-600" />
                    )}
                    <div>
                      <p className="font-medium text-slate-900">{tx.category}</p>
                      <p className="text-sm text-slate-600">{tx.description}</p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={`font-semibold ${
                      tx.type === 'income' ? 'text-emerald-600' : 'text-red-600'
                    }`}
                  >
                    {tx.type === 'income' ? '+' : '-'}
                    {formatCurrency(tx.amount)}
                  </p>
                  <p className="text-sm text-slate-500">{formatDate(tx.transaction_date)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateTransactionModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchTransactions();
          }}
        />
      )}
    </div>
  );
}

function CreateTransactionModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank' | 'check'>('cash');
  const [accountName, setAccountName] = useState('Caisse');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const { error } = await supabase.from('treasury_transactions').insert({
      type,
      category,
      amount: Number(amount),
      transaction_date: date,
      payment_method: paymentMethod,
      account_name: accountName,
      description,
    });

    if (!error) {
      onSuccess();
    }

    setSaving(false);
  }

  return (
    <Modal open={true} onClose={onClose} title="Nouvelle Transaction">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="income"
                checked={type === 'income'}
                onChange={(e) => setType(e.target.value as 'income')}
                className="text-brand-600"
              />
              <span className="text-sm">Entrée</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="expense"
                checked={type === 'expense'}
                onChange={(e) => setType(e.target.value as 'expense')}
                className="text-brand-600"
              />
              <span className="text-sm">Sortie</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Catégorie</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            required
          >
            <option value="">Sélectionner</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Montant (DT)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            step="0.001"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Compte</label>
          <select
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            required
          >
            {ACCOUNTS.map((acc) => (
              <option key={acc} value={acc}>
                {acc}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Méthode</label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'bank' | 'check')}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            required
          >
            <option value="cash">Espèces</option>
            <option value="bank">Virement</option>
            <option value="check">Chèque</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
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
