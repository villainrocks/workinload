/* This code fixed By Tg:@ImxCodex */
import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import {
  Send, Lock, Mail, Eye, EyeOff,
  AlertCircle, Loader2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/* ─── Shared field component ─────────────────────────────────── */
const Field = ({ label, id, error, rightAddon, iconLeft: Icon, ...props }) => (
  <div className="flex flex-col gap-1.5">
    <label htmlFor={id} className="text-sm font-medium text-slate-300">{label}</label>
    <div className="relative">
      {Icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
          <Icon size={16} />
        </div>
      )}
      <input
        id={id}
        className={[
          'w-full bg-slate-800/70 border rounded-xl text-slate-100 placeholder-slate-500',
          'px-4 py-2.5 text-sm outline-none transition-all duration-200 focus:ring-1',
          Icon && 'pl-10',
          rightAddon && 'pr-10',
          error
            ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20'
            : 'border-slate-700 focus:border-blue-500 focus:ring-blue-500/20',
        ].filter(Boolean).join(' ')}
        {...props}
      />
      {rightAddon && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightAddon}</div>
      )}
    </div>
    {error && (
      <p className="text-xs text-red-400 flex items-center gap-1 animate-fade-in">
        <AlertCircle size={11} className="flex-shrink-0" /> {error}
      </p>
    )}
  </div>
);

/* ─── Validation helpers ─────────────────────────────────────── */
const validateLogin = ({ email, password }) => {
  const e = {};
  if (!email.trim()) e.email = 'Username or email is required.';
  if (!password) e.password = 'Password is required.';
  return e;
};



/* ─── Auth Page ──────────────────────────────────────────────── */
const LoginPage = () => {
  const { login, isAuthenticated, authError, clearError, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from     = location.state?.from?.pathname || '/dashboard';

  const [showPass, setShowPass]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [serverErr, setServerErr] = useState('');

  // Login form
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginErrors, setLoginErrors] = useState({});

  useEffect(() => {
    if (authError) { setServerErr(authError); clearError(); }
  }, [authError, clearError]);

  if (!authLoading && isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  /* ── Login submit ── */
  const handleLogin = async (e) => {
    e.preventDefault();
    const errs = validateLogin(loginForm);
    if (Object.keys(errs).length) { setLoginErrors(errs); return; }

    setLoading(true);
    setServerErr('');
    try {
      await login(loginForm);
      navigate(from, { replace: true });
    } catch (err) {
      setServerErr(
        err.response?.data?.detail ||
        err.response?.data?.message ||
        'Invalid email or password.'
      );
    } finally {
      setLoading(false);
    }
  };



  const EyeToggle = ({ show, onToggle }) => (
    <button
      type="button"
      onClick={onToggle}
      tabIndex={-1}
      className="text-slate-500 hover:text-slate-300 transition-colors"
      aria-label={show ? 'Hide password' : 'Show password'}
    >
      {show ? <EyeOff size={16} /> : <Eye size={16} />}
    </button>
  );

  return (
    <div className="min-h-screen bg-[#0d0f14] flex items-center justify-center px-4 relative overflow-hidden">
      {/* Ambient glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-blue-700/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-indigo-700/8 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-[440px] relative z-10">
        {/* Brand */}
        <div className="flex flex-col items-center mb-8 select-none">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-2xl shadow-blue-900/50 mb-4">
            <Send size={22} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">TelegramAuto</h1>
          <p className="text-slate-500 text-sm mt-1">Media Automation Dashboard</p>
        </div>

        {/* Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-sm overflow-hidden">

          <div className="p-8">
            {/* Server error */}
            {serverErr && (
              <div className="mb-5 flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-fade-in">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                <span>{serverErr}</span>
              </div>
            )}

            {/* ── Sign In form ── */}
            <form onSubmit={handleLogin} noValidate className="flex flex-col gap-5" key="login-form">
              <div className="flex flex-col gap-1">
                <h2 className="text-slate-100 font-semibold text-lg">Welcome back</h2>
                <p className="text-slate-500 text-sm">Sign in to your account</p>
              </div>

                <Field
                  label="Username or Email"
                  id="login-email"
                  name="email"
                  type="text"
                  placeholder="Enter username or email"
                  autoComplete="email"
                  iconLeft={Mail}
                  value={loginForm.email}
                  onChange={(e) => { setLoginForm((f) => ({ ...f, email: e.target.value })); setLoginErrors((er) => ({ ...er, email: '' })); setServerErr(''); }}
                  error={loginErrors.email}
                  disabled={loading}
                />

                <Field
                  label="Password"
                  id="login-password"
                  name="password"
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  iconLeft={Lock}
                  value={loginForm.password}
                  onChange={(e) => { setLoginForm((f) => ({ ...f, password: e.target.value })); setLoginErrors((er) => ({ ...er, password: '' })); setServerErr(''); }}
                  error={loginErrors.password}
                  disabled={loading}
                  rightAddon={<EyeToggle show={showPass} onToggle={() => setShowPass((s) => !s)} />}
                />

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700
                    disabled:bg-blue-600/40 disabled:cursor-not-allowed text-white font-semibold
                    py-2.5 rounded-xl transition-all duration-200 shadow-lg shadow-blue-900/30 mt-1"
                >
                  {loading
                    ? <><Loader2 size={16} className="animate-spin" /> Signing in…</>
                    : 'Sign In'
                  }
                </button>

            </form>
          </div>
        </div>

        {/* Terms note */}
        <p className="text-center text-slate-700 text-xs mt-5 leading-relaxed px-4">
          By using TelegramAuto, you agree to responsible use of automation.
        </p>
        <p className="text-center text-slate-700 text-xs mt-1">
          Telegram Media Automation © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
