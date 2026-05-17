/* This code fixed By Tg:@ImxCodex */
import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

/* ─── Context ─────────────────────────────────────────────────── */
const ToastContext = createContext(null);

/* ─── Toast shape ─────────────────────────────────────────────── */
// { id, type: 'success'|'error'|'warning'|'info', message, duration }

const CONFIG = {
  success: { icon: CheckCircle2, bg: 'bg-emerald-900/90', border: 'border-emerald-500/40', text: 'text-emerald-300', bar: 'bg-emerald-500' },
  error:   { icon: XCircle,      bg: 'bg-red-900/90',     border: 'border-red-500/40',     text: 'text-red-300',     bar: 'bg-red-500'     },
  warning: { icon: AlertTriangle,bg: 'bg-amber-900/90',   border: 'border-amber-500/40',   text: 'text-amber-300',   bar: 'bg-amber-500'   },
  info:    { icon: Info,         bg: 'bg-blue-900/90',    border: 'border-blue-500/40',    text: 'text-blue-300',    bar: 'bg-blue-500'    },
};

/* ─── Single toast item ───────────────────────────────────────── */
const ToastItem = ({ toast, onRemove }) => {
  const c = CONFIG[toast.type] ?? CONFIG.info;
  const Icon = c.icon;

  return (
    <div
      className={[
        'relative flex items-start gap-3 px-4 py-3.5 rounded-xl border shadow-2xl',
        'animate-slide-down overflow-hidden max-w-sm w-full',
        c.bg, c.border,
      ].join(' ')}
      role="alert"
    >
      {/* Progress bar */}
      <div
        className={`absolute bottom-0 left-0 h-0.5 ${c.bar} rounded-full`}
        style={{
          animation: `shrinkWidth ${toast.duration ?? 4000}ms linear forwards`,
        }}
      />

      <Icon size={16} className={`flex-shrink-0 mt-0.5 ${c.text}`} />
      <p className={`flex-1 text-sm font-medium leading-snug ${c.text}`}>
        {toast.message}
      </p>
      <button
        onClick={() => onRemove(toast.id)}
        className={`flex-shrink-0 ${c.text} opacity-60 hover:opacity-100 transition-opacity`}
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>

      <style>{`
        @keyframes shrinkWidth {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
    </div>
  );
};

/* ─── Toast container ─────────────────────────────────────────── */
const ToastContainer = ({ toasts, onRemove }) => {
  if (toasts.length === 0) return null;
  return (
    <div
      className="fixed top-5 right-5 z-[100] flex flex-col gap-2.5 items-end"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onRemove={onRemove} />
      ))}
    </div>
  );
};

/* ─── Provider ────────────────────────────────────────────────── */
let _idCounter = 0;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message, type = 'info', duration = 4000) => {
    const id = ++_idCounter;
    setToasts((prev) => [...prev, { id, message, type, duration }]);
    setTimeout(() => remove(id), duration + 300); // +300ms for animation
    return id;
  }, [remove]);

  // Convenience helpers
  toast.success = (msg, dur) => toast(msg, 'success', dur);
  toast.error   = (msg, dur) => toast(msg, 'error',   dur);
  toast.warning = (msg, dur) => toast(msg, 'warning', dur);
  toast.info    = (msg, dur) => toast(msg, 'info',    dur);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} onRemove={remove} />
    </ToastContext.Provider>
  );
};

/* ─── Hook ────────────────────────────────────────────────────── */
export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
};
