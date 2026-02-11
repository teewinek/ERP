import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import CommandPalette from '../ui/CommandPalette';
import WhatsAppButton from '../ui/WhatsAppButton';

interface LayoutProps {
  userName: string;
  onSignOut: () => void;
}

export default function Layout({ userName, onSignOut }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandOpen((prev) => !prev);
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar
          onMenuClick={() => setSidebarOpen(true)}
          onSearchClick={() => setCommandOpen(true)}
          userName={userName}
          onSignOut={onSignOut}
        />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 scrollbar-thin">
          <Outlet />
        </main>
      </div>
      <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} />
      <WhatsAppButton />
    </div>
  );
}
