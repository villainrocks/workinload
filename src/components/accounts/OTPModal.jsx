/* This code fixed By Tg:@ImxCodex */
import { useState, useRef, useEffect } from 'react';
import { ShieldCheck, AlertCircle, Loader2, RefreshCw, CheckCircle2, KeyRound, Eye, EyeOff } from 'lucide-react';
import Modal from '../ui/Modal';
import { telegramService } from '../../services/telegram.service';

/**
 * OTPModal
 *
 * Step 2 of the OTP flow — 5-digit code entry with:
 *  - Auto-focus on first input
 *  - Auto-advance to next box on digit input
 *  - Backspace moves to previous box
 *  - Paste support (fills all boxes)
 *  - Resend OTP with 60s cooldown
 *  - Success animation before closing
 *
 * Props:
 *  open       boolean
 *  onClose    () => void
 *  session    { session_id, phone }
 *  onVerified (account) => void   — called with new account data
 */
const OTP_LENGTH = 5;

const getApiErrorMessage = (err, fallback) => (
  err.response?.data?.error?.message ||
  err.response?.data?.detail ||
  err.response?.data?.message ||
  fallback
);

const OTPModal = ({ open, onClose, session, onVerified }) => {
  const [digits, setDigits]     = useState(Array(OTP_LENGTH).fill(''));
  const [password, setPassword] = useState('');
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [passwordHint, setPasswordHint] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState(false);
  const [resendCd, setResendCd] = useState(0); // countdown seconds
  const inputRefs = useRef([]);
  const passwordRef = useRef(null);

  // Auto-focus first box on open
  useEffect(() => {
    if (open) {
      setDigits(Array(OTP_LENGTH).fill(''));
      setPassword('');
      setPasswordRequired(false);
      setPasswordHint('');
      setShowPassword(false);
      setError('');
      setSuccess(false);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    if (passwordRequired) {
      setTimeout(() => passwordRef.current?.focus(), 100);
    }
  }, [passwordRequired]);

  // Resend countdown
  useEffect(() => {
    if (resendCd <= 0) return;
    const t = setTimeout(() => setResendCd((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCd]);

  const handleDigit = (idx, value) => {
    const digit = value.replace(/\D/, '').slice(-1);
    const next = [...digits];
    next[idx] = digit;
    setDigits(next);
    setError('');
    if (digit && idx < OTP_LENGTH - 1) {
      inputRefs.current[idx + 1]?.focus();
    }
    // Auto-submit when all filled
    if (digit && next.every(Boolean)) {
      submitCode(next.join(''));
    }
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    const next = Array(OTP_LENGTH).fill('');
    pasted.split('').forEach((c, i) => { next[i] = c; });
    setDigits(next);
    inputRefs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
    if (pasted.length === OTP_LENGTH) submitCode(pasted);
  };

  const submitPassword = async () => {
    if (!session || !password.trim()) return;
    setLoading(true);
    setError('');

    try {
      const { data } = await telegramService.verify({
        session_id: session.session_id,
        phone: session.phone,
        password,
      });

      if (data.passwordRequired) {
        setError('Enter your Telegram two-step password to finish linking.');
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        onVerified(data.account ?? data);
        onClose();
        setSuccess(false);
      }, 1200);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Invalid Telegram password. Please try again.'));
      setPassword('');
      setTimeout(() => passwordRef.current?.focus(), 50);
    } finally {
      setLoading(false);
    }
  };

  const submitCode = async (code) => {
    if (!session) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await telegramService.verify({
        session_id: session.session_id,
        code,
        phone: session.phone,
      });

      if (data.passwordRequired) {
        setPasswordRequired(true);
        setPasswordHint(data.hint || '');
        setPassword('');
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        onVerified(data.account ?? data);
        onClose();
        setSuccess(false);
      }, 1200);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Invalid code. Please try again.'));
      setDigits(Array(OTP_LENGTH).fill(''));
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!session || resendCd > 0) return;
    try {
      await telegramService.resendOtp(session.phone);
      setResendCd(60);
      setError('');
      setDigits(Array(OTP_LENGTH).fill(''));
      setPassword('');
      setPasswordRequired(false);
      setPasswordHint('');
      setShowPassword(false);
      inputRefs.current[0]?.focus();
    } catch {
      setError('Failed to resend code. Please wait and try again.');
    }
  };

  const handleClose = () => {
    if (loading) return;
    setDigits(Array(OTP_LENGTH).fill(''));
    setPassword('');
    setPasswordRequired(false);
    setPasswordHint('');
    setShowPassword(false);
    setError('');
    setSuccess(false);
    onClose();
  };

  const code = digits.join('');
  const canSubmit = passwordRequired
    ? password.trim().length > 0 && !loading && !success
    : code.length === OTP_LENGTH && !loading && !success;

  return (
    <Modal open={open} onClose={handleClose} title="Verify Telegram Account" size="sm">
      <div className="flex flex-col items-center gap-6">
        {/* Icon */}
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-500 ${
          success
            ? 'bg-emerald-500/15 border border-emerald-500/30'
            : 'bg-blue-500/10 border border-blue-500/20'
        }`}>
          {success
            ? <CheckCircle2 size={30} className="text-emerald-400" />
            : <ShieldCheck  size={30} className="text-blue-400"    />
          }
        </div>

        {/* Instruction */}
        <div className="text-center">
          <p className="text-slate-200 font-medium text-sm">
            {success
              ? 'Account Connected!'
              : passwordRequired
                ? 'Enter Two-Step Password'
                : 'Enter Verification Code'
            }
          </p>
          {!success && (
            <p className="text-slate-500 text-xs mt-1">
              {passwordRequired ? (
                <>
                  Telegram requires your cloud password for{' '}
                  <span className="text-slate-300 font-mono">{session?.phone}</span>
                  {passwordHint && (
                    <span className="block mt-1">Hint: {passwordHint}</span>
                  )}
                </>
              ) : (
                <>
                  Code sent to your Telegram app for{' '}
                  <span className="text-slate-300 font-mono">{session?.phone}</span>
                </>
              )}
            </p>
          )}
        </div>

        {/* OTP boxes */}
        {!success && !passwordRequired && (
          <div className="flex gap-3" onPaste={handlePaste}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={(e) => handleDigit(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                disabled={loading}
                className={[
                  'w-11 h-13 text-center text-xl font-bold rounded-xl border-2 bg-slate-800/80',
                  'text-slate-100 outline-none transition-all duration-150',
                  'focus:scale-105',
                  d
                    ? 'border-blue-500 bg-blue-500/10 text-blue-300'
                    : 'border-slate-700 focus:border-blue-500/70',
                  error && 'border-red-500/50 shake',
                  loading && 'opacity-50 cursor-not-allowed',
                ].filter(Boolean).join(' ')}
              />
            ))}
          </div>
        )}

        {/* Password input */}
        {!success && passwordRequired && (
          <div className="w-full flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-300">Telegram Password</label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                <KeyRound size={16} />
              </div>
              <input
                ref={passwordRef}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    submitPassword();
                  }
                }}
                disabled={loading}
                autoComplete="current-password"
                className="w-full pl-10 pr-11 py-2.5 bg-slate-800/70 border border-slate-700 rounded-xl
                  text-slate-100 placeholder-slate-500 text-sm outline-none transition-all
                  focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20
                  disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                type="button"
                onClick={() => setShowPassword((show) => !show)}
                disabled={loading}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg
                  flex items-center justify-center text-slate-500 hover:text-slate-300
                  hover:bg-slate-700/60 transition-colors disabled:opacity-50"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5 w-full">
            <AlertCircle size={14} className="flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Submit button */}
        {!success && (
          <button
            onClick={() => passwordRequired ? submitPassword() : submitCode(code)}
            disabled={!canSubmit}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
              bg-blue-600 hover:bg-blue-700 disabled:bg-slate-800 disabled:text-slate-500
              disabled:cursor-not-allowed text-white text-sm font-medium transition-all
              shadow-lg shadow-blue-900/20"
          >
            {loading
              ? <><Loader2 size={14} className="animate-spin" /> Verifying...</>
              : passwordRequired ? 'Verify Password' : 'Verify Code'
            }
          </button>
        )}

        {/* Resend */}
        {!success && !passwordRequired && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span>Didn't receive it?</span>
            {resendCd > 0 ? (
              <span className="text-slate-600">Resend in {resendCd}s</span>
            ) : (
              <button
                onClick={handleResend}
                className="text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
              >
                <RefreshCw size={11} /> Resend code
              </button>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default OTPModal;
