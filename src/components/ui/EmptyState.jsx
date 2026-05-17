/* This code fixed By Tg:@ImxCodex */
import { classNames } from '../../utils/helpers';

/**
 * EmptyState — consistent zero-data placeholder.
 *
 * Props:
 *  icon       Lucide component
 *  title      string
 *  message    string
 *  action     { label, onClick }  — optional CTA button
 *  color      'blue'|'violet'|'emerald'|'amber'   (icon accent)
 *  compact    boolean  — smaller padding for table cells
 */
const colors = {
  blue:    { bg: 'bg-blue-500/10',    border: 'border-blue-500/20',    icon: 'text-blue-400'    },
  violet:  { bg: 'bg-violet-500/10',  border: 'border-violet-500/20',  icon: 'text-violet-400'  },
  emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: 'text-emerald-400' },
  amber:   { bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   icon: 'text-amber-400'   },
  slate:   { bg: 'bg-slate-800/60',   border: 'border-slate-700/40',   icon: 'text-slate-500'   },
};

const EmptyState = ({
  icon: Icon,
  title = 'Nothing here yet',
  message,
  action,
  color = 'blue',
  compact = false,
}) => {
  const c = colors[color] ?? colors.blue;

  return (
    <div className={classNames(
      'flex flex-col items-center justify-center text-center animate-fade-in',
      compact ? 'py-12 px-6' : 'py-20 px-8'
    )}>
      {Icon && (
        <div className={classNames(
          'flex items-center justify-center rounded-2xl border mb-5',
          compact ? 'w-12 h-12' : 'w-16 h-16',
          c.bg, c.border
        )}>
          <Icon size={compact ? 22 : 28} className={c.icon} />
        </div>
      )}

      <h3 className={classNames(
        'font-semibold text-slate-200 mb-1.5',
        compact ? 'text-sm' : 'text-base'
      )}>
        {title}
      </h3>

      {message && (
        <p className={classNames(
          'text-slate-500 leading-relaxed max-w-xs',
          compact ? 'text-xs' : 'text-sm'
        )}>
          {message}
        </p>
      )}

      {action && (
        <button
          onClick={action.onClick}
          className="mt-5 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700
            text-white text-sm font-medium transition-all shadow-lg shadow-blue-900/30"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
