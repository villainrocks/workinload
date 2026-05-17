/* This code fixed By Tg:@ImxCodex */
import { useState } from 'react';
import { Trash2, Loader2, AlertTriangle } from 'lucide-react';
import Modal from '../ui/Modal';

/**
 * ConfirmDeleteModal — generic destructive-action confirmation dialog.
 *
 * Props:
 *  open      boolean
 *  onClose   () => void
 *  onConfirm () => Promise<void>
 *  title     string
 *  message   string
 */
const ConfirmDeleteModal = ({ open, onClose, onConfirm, title, message }) => {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={title ?? 'Confirm Delete'} size="sm">
      <div className="flex flex-col gap-5">
        <div className="flex gap-3 p-4 rounded-xl bg-red-500/8 border border-red-500/20">
          <AlertTriangle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-slate-300 text-sm leading-relaxed">
            {message ?? 'This action cannot be undone.'}
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-700 text-slate-400
              hover:text-slate-200 hover:bg-slate-800 text-sm font-medium transition-all
              disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
              bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed
              text-white text-sm font-medium transition-all"
          >
            {loading
              ? <><Loader2 size={14} className="animate-spin" /> Deleting…</>
              : <><Trash2 size={14} /> Delete</>
            }
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmDeleteModal;
