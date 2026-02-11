import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Products from './pages/Products';
import Invoices from './pages/Invoices';
import InvoiceForm from './pages/InvoiceForm';
import InvoiceDetail from './pages/InvoiceDetail';
import Quotes from './pages/Quotes';
import QuoteForm from './pages/QuoteForm';
import QuoteDetail from './pages/QuoteDetail';
import Proformas from './pages/Proformas';
import ProformaForm from './pages/ProformaForm';
import ProformaDetail from './pages/ProformaDetail';
import SalesOrders from './pages/SalesOrders';
import ReturnOrders from './pages/ReturnOrders';
import CreditNotes from './pages/CreditNotes';
import Suppliers from './pages/Suppliers';
import Purchases from './pages/Purchases';
import DeliveryNotes from './pages/DeliveryNotes';
import Finance from './pages/Finance';
import Expenses from './pages/Expenses';
import Production from './pages/Production';
import Treasury from './pages/Treasury';
import TEJExport from './pages/TEJExport';
import Settings from './pages/Settings';
import PrintDocument from './pages/PrintDocument';
import Profile from './pages/Profile';
import OrderTracking from './pages/OrderTracking';
import Contact from './pages/Contact';
import VerifyInvoice from './pages/VerifyInvoice';

function App() {
  const { user, profile, loading, signIn, signUp, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login onSignIn={signIn} onSignUp={signUp} />;
  }

  const userName = profile?.full_name || user.email?.split('@')[0] || 'Utilisateur';

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/verify/invoice/:token" element={<VerifyInvoice />} />
        <Route element={<Layout userName={userName} onSignOut={signOut} />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/products" element={<Products />} />
          <Route path="/invoices" element={<Invoices />} />
          <Route path="/invoices/new" element={<InvoiceForm />} />
          <Route path="/invoices/:id" element={<InvoiceDetail />} />
          <Route path="/quotes" element={<Quotes />} />
          <Route path="/quotes/new" element={<QuoteForm />} />
          <Route path="/quotes/:id" element={<QuoteDetail />} />
          <Route path="/proformas" element={<Proformas />} />
          <Route path="/proformas/new" element={<ProformaForm />} />
          <Route path="/proformas/edit/:id" element={<ProformaForm />} />
          <Route path="/proformas/:id" element={<ProformaDetail />} />
          <Route path="/sales-orders" element={<SalesOrders />} />
          <Route path="/return-orders" element={<ReturnOrders />} />
          <Route path="/credit-notes" element={<CreditNotes />} />
          <Route path="/suppliers" element={<Suppliers />} />
          <Route path="/purchases" element={<Purchases />} />
          <Route path="/delivery-notes" element={<DeliveryNotes />} />
          <Route path="/finance" element={<Finance />} />
          <Route path="/treasury" element={<Treasury />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/tej-export" element={<TEJExport />} />
          <Route path="/production" element={<Production />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/order-tracking" element={<OrderTracking />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/print/:type/:id" element={<PrintDocument />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
