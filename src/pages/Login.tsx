import { useState } from 'react';
import { Eye, EyeOff, Loader2, Shield, Lock, Mail, User } from 'lucide-react';

interface LoginProps {
  onSignIn: (email: string, password: string) => Promise<{ error: unknown }>;
  onSignUp: (email: string, password: string, fullName: string) => Promise<{ error: unknown }>;
}

export default function Login({ onSignIn, onSignUp }: LoginProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = isRegister
      ? await onSignUp(email, password, fullName)
      : await onSignIn(email, password);

    if (result.error) {
      setError(isRegister ? 'Erreur lors de l\'inscription' : 'Email ou mot de passe incorrect');
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:flex-1 relative overflow-hidden items-center justify-center" style={{ background: 'linear-gradient(135deg, #0d1526 0%, #0f2027 50%, #0d1526 100%)' }}>
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-80 h-80 bg-brand-500/10 rounded-full blur-[100px]" />
          <div className="absolute bottom-20 right-20 w-64 h-64 bg-cyan-500/10 rounded-full blur-[80px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand-600/5 rounded-full blur-[120px]" />
        </div>

        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

        <div className="relative z-10 text-center px-12 max-w-lg">
          <div className="flex items-center justify-center mx-auto mb-8">
            <img
              src="https://i0.wp.com/www.teewinek.com/wp-content/uploads/2024/05/LOGO-TEEWINEK.png"
              alt="Teewinek Logo"
              className="h-32 w-auto object-contain"
            />
          </div>
          <h2 className="text-4xl font-extrabold text-white mb-3 tracking-tight">Teewinek ERP PRO</h2>
          <p className="text-base text-slate-400 leading-relaxed mb-10">
            Gerez votre activite d'impression personnalisee avec un ERP moderne, rapide et securise
          </p>

          <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto mb-10">
            {[
              { label: 'DTF', desc: 'Transfert' },
              { label: 'UV', desc: 'Impression' },
              { label: 'Broderie', desc: 'Textile' },
              { label: 'Laser', desc: 'Gravure' },
            ].map((tech) => (
              <div key={tech.label} className="px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.07] transition-all">
                <p className="text-sm font-semibold text-white">{tech.label}</p>
                <p className="text-[11px] text-slate-500">{tech.desc}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-center gap-6 text-[11px] text-slate-500">
            <div className="flex items-center gap-1.5">
              <Shield size={13} className="text-brand-400" />
              <span>SSL Securise</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Lock size={13} className="text-brand-400" />
              <span>Donnees chiffrees</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-slate-50">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center justify-center mb-10">
            <img
              src="https://i0.wp.com/www.teewinek.com/wp-content/uploads/2024/05/LOGO-TEEWINEK.png"
              alt="Teewinek Logo"
              className="h-20 w-auto object-contain"
            />
          </div>

          <h2 className="text-2xl font-extrabold text-slate-900 mb-1">
            {isRegister ? 'Creer un compte' : 'Bon retour'}
          </h2>
          <p className="text-sm text-slate-500 mb-8">
            {isRegister ? 'Remplissez les informations ci-dessous' : 'Connectez-vous a votre espace de gestion'}
          </p>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Nom complet</label>
                <div className="relative">
                  <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                    placeholder="Ahmed Ben Ali"
                  />
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                  placeholder="votre@email.com"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Mot de passe</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                  placeholder="Minimum 6 caracteres"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {isRegister ? 'Creer le compte' : 'Se connecter'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            {isRegister ? 'Deja un compte ?' : 'Pas encore de compte ?'}{' '}
            <button
              onClick={() => { setIsRegister(!isRegister); setError(''); }}
              className="text-brand-600 font-semibold hover:text-brand-700 transition-colors"
            >
              {isRegister ? 'Se connecter' : 'Creer un compte'}
            </button>
          </p>

          <div className="mt-8 pt-6 border-t border-slate-200 text-center">
            <p className="text-[11px] text-slate-400">
              Teewinek ERP PRO - Impression sur tout support
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
