import { Menu, Search, Bell, LogOut, User } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface TopbarProps {
  onMenuClick: () => void;
  onSearchClick: () => void;
  userName: string;
  onSignOut: () => void;
}

export default function Topbar({ onMenuClick, onSearchClick, userName, onSignOut }: TopbarProps) {
  const [showProfile, setShowProfile] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfile(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <header className="sticky top-0 z-30 glass border-b border-slate-200/50 px-4 lg:px-6">
      <div className="flex items-center justify-between h-16">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
          >
            <Menu size={20} />
          </button>
          <button
            onClick={onSearchClick}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-sm text-slate-500 transition-colors"
          >
            <Search size={15} />
            <span>Rechercher...</span>
            <kbd className="ml-4 text-[10px] font-medium bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-400">
              Ctrl+K
            </kbd>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onSearchClick}
            className="sm:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
          >
            <Search size={20} />
          </button>
          <button className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors">
            <Bell size={20} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          </button>

          <div ref={profileRef} className="relative ml-1">
            <button
              onClick={() => setShowProfile(!showProfile)}
              className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center">
                <span className="text-white text-xs font-semibold">
                  {userName.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="hidden sm:block text-sm font-medium text-slate-700">
                {userName}
              </span>
            </button>

            {showProfile && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden animate-slide-up">
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="text-sm font-medium text-slate-900">{userName}</p>
                  <p className="text-xs text-slate-500">Administrateur</p>
                </div>
                <div className="p-1">
                  <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                    <User size={15} />
                    Profil
                  </button>
                  <button
                    onClick={onSignOut}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut size={15} />
                    Deconnexion
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
