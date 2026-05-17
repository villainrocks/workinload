/* This code fixed By Tg:@ImxCodex */
import { classNames } from '../../utils/helpers';

/**
 * StatusDot — colored pulsing or static indicator dot.
 * status: 'online' | 'offline' | 'warning' | 'idle'
 */
const colors = {
  online:  { dot: 'bg-emerald-400', ring: 'bg-emerald-400/30', label: 'Online'  },
  offline: { dot: 'bg-slate-500',   ring: '',                  label: 'Offline' },
  warning: { dot: 'bg-amber-400',   ring: 'bg-amber-400/30',   label: 'Warning' },
  idle:    { dot: 'bg-blue-400',    ring: 'bg-blue-400/30',    label: 'Idle'    },
  error:   { dot: 'bg-red-400',     ring: 'bg-red-400/30',     label: 'Error'   },
};

const StatusDot = ({ status = 'offline', showLabel = false, pulse = true, className = '' }) => {
  const c = colors[status] ?? colors.offline;
  return (
    <span className={classNames('inline-flex items-center gap-1.5', className)}>
      <span className="relative flex h-2.5 w-2.5">
        {pulse && c.ring && (
          <span className={classNames('animate-ping absolute inline-flex h-full w-full rounded-full opacity-75', c.ring)} />
        )}
        <span className={classNames('relative inline-flex rounded-full h-2.5 w-2.5', c.dot)} />
      </span>
      {showLabel && <span className="text-xs text-slate-400">{c.label}</span>}
    </span>
  );
};

export default StatusDot;
