/* This code fixed By Tg:@ImxCodex */
import { useEffect } from 'react';
import { X } from 'lucide-react';
import { classNames } from '../../utils/helpers';

/**
 * Modal — portal-style overlay with ESC + backdrop-click close.
 *
 * Props:
 *  open      boolean
 *  onClose   () => void
 *  title     string
 *  size      'sm' | 'md' | 'lg'
 *  children
 */
const sizes = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-xl',
};

const Modal = ({ open, onClose, title, size = 'md', children }) => {
  // ESC to close
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={classNames(
          'relative w-full bg-[#13151c] border border-slate-800 rounded-2xl shadow-2xl',
          'animate-in fade-in zoom-in-95 duration-150',
          'flex flex-col max-h-[85vh]',
          sizes[size]
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 md:px-5 md:py-4 border-b border-slate-800 flex-shrink-0">
          <h2 id="modal-title" className="text-slate-100 font-bold text-sm md:text-base tracking-tight">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-all"
            aria-label="Close modal"
          >
            <X size={18} className="md:w-5 md:h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-4 md:px-6 md:py-5 overflow-y-auto custom-scrollbar no-scrollbar">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
