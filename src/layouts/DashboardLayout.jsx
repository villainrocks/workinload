/* This code fixed By Tg:@ImxCodex */
import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import BottomNav from '../components/BottomNav';
import { pageTitles } from '../config/navigation';

const DashboardLayout = () => {
  // Desktop: sidebar collapsed/expanded
  const [collapsed, setCollapsed] = useState(false);
  // Mobile: sidebar open/closed (overlay)
  const [mobileOpen, setMobileOpen] = useState(false);

  const { pathname } = useLocation();
  const title = pageTitles[pathname] ?? 'TelegramAuto';

  // Close mobile sidebar on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  // Close mobile sidebar on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setMobileOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-[#0d0f14]">
      {/* ── Mobile backdrop overlay ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Sidebar — hidden on mobile unless mobileOpen ── */}
      <div
        className={[
          'fixed inset-y-0 left-0 z-30 lg:relative lg:z-auto',
          'transition-transform duration-300 ease-in-out',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        ].join(' ')}
      >
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed((c) => !c)}
        />
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <Topbar
          pageTitle={title}
          onMenuClick={() => setMobileOpen((o) => !o)}
        />
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 pb-24 lg:pb-6">
          <Outlet />
        </main>
        
        {/* Mobile Bottom Navigation */}
        <BottomNav />
      </div>
    </div>
  );
};

export default DashboardLayout;
