/* This code fixed By Tg:@ImxCodex */
import { classNames } from '../../utils/helpers';

const Input = ({
  label,
  error,
  icon: Icon,
  className = '',
  containerClass = '',
  ...props
}) => (
  <div className={classNames('flex flex-col gap-1.5', containerClass)}>
    {label && (
      <label className="text-sm font-medium text-slate-300">{label}</label>
    )}
    <div className="relative">
      {Icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
          <Icon size={16} />
        </div>
      )}
      <input
        className={classNames(
          'w-full bg-slate-900/40 border border-slate-700/60 rounded-2xl text-slate-100 placeholder-slate-500 backdrop-blur-sm',
          'px-5 py-3 text-sm outline-none transition-all duration-300',
          'focus:bg-slate-900/80 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10',
          error && 'border-red-500/60 focus:border-red-500 focus:ring-red-500/10',
          Icon && 'pl-11',
          className
        )}
        {...props}
      />
    </div>
    {error && <p className="text-xs text-red-400">{error}</p>}
  </div>
);

export default Input;
