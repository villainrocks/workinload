/* This code fixed By Tg:@ImxCodex */
import { useState } from 'react';
import { Phone, AlertCircle, Loader2, Info } from 'lucide-react';
import Modal from '../ui/Modal';
import { telegramService } from '../../services/telegram.service';

/**
 * AddAccountModal
 *
 * Step 1 of the OTP flow — collect phone number, call /telegram/connect.
 * On success → calls onOtpSent({ session_id, phone }) so parent can
 * open the OTP modal.
 */

// Minimal phone normalizer — strips spaces/dashes, ensures leading +
const normalizePhone = (raw) => {
  let p = raw.replace(/[\s\-().]/g, '');
  if (!p.startsWith('+')) p = '+' + p;
  return p;
};

const AddAccountModal = ({ open, onClose, onOtpSent }) => {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    setPhone('');
    setError('');
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const normalized = normalizePhone(phone);
    if (normalized.length < 8) {
      setError('Enter a valid international phone number (e.g. +14155552671).');
      return;
    }

    setLoading(true);
    try {
      const { data } = await telegramService.connect(normalized);
      // data = { session_id, message }
      handleClose();
      onOtpSent({ session_id: data.session_id, phone: normalized });
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        'Failed to send OTP. Check the number and try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Connect Telegram Account" size="sm">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Info box */}
        <div className="flex gap-2.5 p-3.5 rounded-xl bg-blue-500/8 border border-blue-500/20 text-blue-300 text-sm">
          <Info size={16} className="flex-shrink-0 mt-0.5 text-blue-400" />
          <p className="text-slate-400 leading-relaxed text-sm">
            Enter the phone number linked to your Telegram account. A verification
            code will be sent to your <span className="text-blue-300 font-medium">Telegram app</span>.
          </p>
        </div>

        {/* Phone input */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-300">Phone Number</label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
              <Phone size={16} />
            </div>
            <input
              type="tel"
              placeholder="+1 415 555 2671"
              value={phone}
              onChange={(e) => { setPhone(e.target.value); setError(''); }}
              disabled={loading}
              autoFocus
              className="w-full pl-10 pr-4 py-2.5 bg-slate-800/70 border border-slate-700 rounded-xl
                text-slate-100 placeholder-slate-500 text-sm outline-none transition-all
                focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20
                disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
          {error && (
            <p className="flex items-center gap-1.5 text-xs text-red-400 mt-0.5">
              <AlertCircle size={12} /> {error}
            </p>
          )}
          <p className="text-[11px] text-slate-600 mt-0.5">
            Include country code, e.g. <span className="text-slate-500">+14155552671</span>
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-700 text-slate-400
              hover:text-slate-200 hover:bg-slate-800 text-sm font-medium transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !phone.trim()}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
              bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/40 disabled:cursor-not-allowed
              text-white text-sm font-medium transition-all shadow-lg shadow-blue-900/30"
          >
            {loading ? <><Loader2 size={14} className="animate-spin" /> Sending…</> : 'Send OTP'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AddAccountModal;
