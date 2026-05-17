/* This code fixed By Tg:@ImxCodex */
import { classNames } from '../../utils/helpers';

const colors = {
  blue:    'bg-blue-500/15 text-blue-400 border-blue-500/25',
  green:   'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  red:     'bg-red-500/15 text-red-400 border-red-500/25',
  yellow:  'bg-amber-500/15 text-amber-400 border-amber-500/25',
  purple:  'bg-purple-500/15 text-purple-400 border-purple-500/25',
  gray:    'bg-slate-500/15 text-slate-400 border-slate-500/25',
};

const Badge = ({ children, color = 'gray', className = '' }) => (
  <span
    className={classNames(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
      colors[color],
      className
    )}
  >
    {children}
  </span>
);

export default Badge;
