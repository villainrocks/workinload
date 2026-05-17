/* This code fixed By Tg:@ImxCodex */
import { Bell, Search, Menu } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const Topbar = ({ pageTitle, onMenuClick }) => {
  const { user } = useAuth();
  const [searchFocused, setSearchFocused] = useState(false);
  const [notifications] = useState(3); // mock count

  return (
    <header className="h-16 flex items-center gap-4 px-4 md:px-6 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md flex-shrink-0 z-10">
      {/* Mobile hamburger */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all flex-shrink-0"
        aria-label="Toggle sidebar"
      >
        <Menu size={22} />
      </button>

      {/* Page title */}
      <h1 className="text-slate-100 font-semibold text-base md:text-lg flex-shrink-0">
        {pageTitle}
      </h1>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Search */}
      <div
        className={[
          'hidden md:flex items-center gap-2 border rounded-lg px-3 py-2 transition-all duration-200',
          searchFocused
            ? 'bg-slate-800 border-blue-500/50 w-56'
            : 'bg-slate-800/50 border-slate-700/60 w-44',
        ].join(' ')}
      >
        <Search size={14} className="text-slate-500 flex-shrink-0" />
        <input
          placeholder="Search…"
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          className="bg-transparent text-sm text-slate-300 placeholder-slate-500 outline-none w-full"
        />
      </div>

      {/* Notification bell */}
      <button className="relative p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all flex-shrink-0">
        <Bell size={18} />
        {notifications > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-0.5 bg-blue-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center leading-none">
            {notifications}
          </span>
        )}
      </button>

      {/* User avatar */}
      {user && (
        <button className="flex items-center gap-2 md:gap-2.5 pl-1.5 pr-1.5 md:pr-3 py-1.5 rounded-lg hover:bg-slate-800 transition-all">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
            {user.username?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <span className="hidden md:block text-sm text-slate-300 font-medium">
            {user.username ?? 'User'}
          </span>
        </button>
      )}
    </header>
  );
};

export default Topbar;
