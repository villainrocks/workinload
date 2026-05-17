/* This code fixed By Tg:@ImxCodex */
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getNavigationItems } from '../config/navigation';

const BottomNav = () => {
  const { user } = useAuth();
  const navItems = getNavigationItems(user, { includeAbout: false });

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-4 lg:hidden pointer-events-none">
      <nav className="bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-[28px] shadow-2xl shadow-blue-900/20 pointer-events-auto pb-safe">
        <div className="flex items-center justify-around h-[72px] px-2">
          {navItems.map(({ to, icon: Icon, mobileLabel, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `
                flex flex-col items-center justify-center gap-1 min-w-[64px] h-full transition-all duration-300 active:scale-95
                ${isActive ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'}
              `}
            >
              {({ isActive }) => (
                <>
                  <div className={`
                    p-1.5 rounded-2xl transition-all duration-300
                    ${isActive ? 'bg-blue-500/15 shadow-inner shadow-blue-400/20' : ''}
                  `}>
                    <Icon size={22} className={isActive ? 'drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]' : ''} />
                  </div>
                  <span className={`text-[10px] font-bold tracking-wide transition-all duration-300 ${isActive ? 'opacity-100' : 'opacity-70'}`}>{mobileLabel || label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default BottomNav;
