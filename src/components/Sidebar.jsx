/* This code fixed By Tg:@ImxCodex */
import { NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  Send,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { classNames } from '../utils/helpers';
import { getNavigationItems } from '../config/navigation';

const Sidebar = ({ collapsed, onToggle }) => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  const navItems = getNavigationItems(user);

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <aside
      className={classNames(
        'h-screen flex flex-col bg-[#111318] border-r border-slate-800/80',
        'transition-all duration-300 ease-in-out flex-shrink-0',
        collapsed ? 'w-[68px]' : 'w-60'
      )}
    >
      {/* ── Logo ── */}
      <div className="flex items-center h-16 px-4 border-b border-slate-800/80 flex-shrink-0">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-900/40 flex-shrink-0">
            <Send size={14} className="text-white" />
          </div>
          {!collapsed && (
            <span className="font-semibold text-slate-100 text-sm tracking-wide truncate">
              NexusPanel Advance By Codex
            </span>
          )}
        </div>

        {/* Collapse toggle — desktop only */}
        <button
          onClick={onToggle}
          className="hidden lg:flex p-1.5 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-slate-800 transition-all flex-shrink-0"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
      </div>

      {/* ── Section label ── */}
      {!collapsed && (
        <p className="px-4 pt-5 pb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
          Navigation
        </p>
      )}

      {/* ── Nav links ── */}
      <nav className="flex-1 px-2 pb-2 flex flex-col gap-0.5 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              classNames(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-blue-600/15 text-blue-400'
                  : 'text-slate-500 hover:text-slate-200 hover:bg-slate-800/60'
              )
            }
          >
            {({ isActive }) => (
              <>
                <div className={classNames(
                  'flex-shrink-0 w-5 h-5 flex items-center justify-center',
                  isActive && 'text-blue-400'
                )}>
                  <Icon size={17} />
                </div>
                {!collapsed && (
                  <span className="flex-1 truncate">{label}</span>
                )}
                {/* Active indicator dot */}
                {isActive && !collapsed && (
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* ── User profile + logout ── */}
      <div className="border-t border-slate-800/80 p-3 flex-shrink-0">
        {!collapsed && user && (
          <div className="flex items-center gap-2.5 px-2 py-2.5 mb-1 rounded-xl bg-slate-800/40 border border-slate-700/30">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
              {user.username?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-200 truncate">{user.username ?? 'User'}</p>
              <p className="text-[11px] text-slate-500 truncate">{user.email ?? 'Admin'}</p>
            </div>
            <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" title="Online" />
          </div>
        )}

        <button
          onClick={handleLogout}
          disabled={loggingOut}
          title={collapsed ? 'Logout' : undefined}
          className={classNames(
            'flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
            'text-slate-500 hover:text-red-400 hover:bg-red-500/10',
            loggingOut && 'opacity-50 cursor-not-allowed'
          )}
        >
          <LogOut size={17} className="flex-shrink-0" />
          {!collapsed && (loggingOut ? 'Signing out…' : 'Logout')}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
