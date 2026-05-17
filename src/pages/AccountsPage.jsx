/* This code fixed By Tg:@ImxCodex */
import { useEffect, useState } from 'react';
import {
  Plus, Users, RefreshCw, Trash2, Power, PowerOff,
  AlertCircle, Send, Layers, Clock, Search,
} from 'lucide-react';
import { telegramService } from '../services/telegram.service';
import { useAccounts } from '../hooks/useAccounts';
import AddAccountModal from '../components/accounts/AddAccountModal';
import OTPModal from '../components/accounts/OTPModal';
import ConfirmDeleteModal from '../components/accounts/ConfirmDeleteModal';
import Badge from '../components/ui/Badge';
import StatusDot from '../components/ui/StatusDot';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';

/* ─── Skeleton row ─────────────────────────────────────────── */
const SkeletonRow = () => (
  <tr className="border-b border-slate-800/50 animate-pulse">
    {[...Array(6)].map((_, i) => (
      <td key={i} className="px-6 py-4">
        <div className="h-4 bg-slate-800 rounded-lg w-3/4" />
      </td>
    ))}
  </tr>
);



/* ─── Stat summary strip ───────────────────────────────────── */
const SummaryStrip = ({ accounts }) => {
  const online   = accounts.filter((a) => a.status === 'online' || a.is_active).length;
  const groups   = accounts.reduce((s, a) => s + (a.groups_count ?? 0), 0);
  const posts    = accounts.reduce((s, a) => s + (a.posts_today ?? 0), 0);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {[
        { icon: Users,  label: 'Total',   value: accounts.length, color: 'text-blue-400'    },
        { icon: Power,  label: 'Active',  value: online,          color: 'text-emerald-400' },
        { icon: Layers, label: 'Groups',  value: groups,          color: 'text-violet-400'  },
        { icon: Clock,  label: 'Posts Today', value: posts,       color: 'text-amber-400'   },
      ].map(({ icon: Icon, label, value, color }) => (
        <div key={label}
          className="flex items-center gap-3 bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-3">
          <Icon size={18} className={color} />
          <div>
            <p className="text-xl font-bold text-slate-100 leading-none">{value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

/* ─── Accounts Page ────────────────────────────────────────── */
const AccountsPage = () => {
  const { accounts, loading, error, load, remove, toggle, add } =
    useAccounts(telegramService.getAccounts);

  // Modal state
  const [showAdd, setShowAdd]       = useState(false);
  const [otpSession, setOtpSession] = useState(null); // { session_id, phone }
  const [deleteTarget, setDeleteTarget] = useState(null); // account object

  // Search / filter
  const [search, setSearch] = useState('');
  const [togglingId, setTogglingId] = useState(null);

  useEffect(() => { load(); }, [load]);

  /* ── Handlers ── */
  const handleOtpSent = (session) => setOtpSession(session);

  const handleVerified = (account) => {
    add(account);
    setOtpSession(null);
  };

  const handleToggle = async (account) => {
    setTogglingId(account.id);
    try {
      await telegramService.toggleAccount(account.id);
      toggle(account.id);
    } catch {
      /* silent — row returns to original state */
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await telegramService.deleteAccount(deleteTarget.id);
    remove(deleteTarget.id);
  };

  /* ── Filtered list ── */
  const filtered = accounts.filter((a) =>
    !search || a.phone?.includes(search) || a.username?.toLowerCase().includes(search.toLowerCase())
  );

  /* ── Status helpers ── */
  const dotStatus = (acc) => {
    if (!acc.is_active) return 'offline';
    if (acc.status === 'warning') return 'warning';
    if (acc.status === 'idle') return 'idle';
    return 'online';
  };

  const badgeColor = (acc) => {
    if (!acc.is_active) return 'gray';
    if (acc.status === 'warning') return 'yellow';
    return 'green';
  };

  const badgeLabel = (acc) => {
    if (!acc.is_active) return 'Inactive';
    if (acc.status === 'warning') return 'Warning';
    return 'Active';
  };

  return (
    <div className="flex flex-col gap-6 pb-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Telegram Accounts</h2>
          <p className="text-slate-500 text-sm mt-0.5">
            Manage connected accounts and their automation sessions.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={load}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-700 text-slate-400
              hover:text-slate-200 hover:bg-slate-800 transition-all disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          <Button icon={Plus} onClick={() => setShowAdd(true)}>
            Connect Account
          </Button>
        </div>
      </div>

      {/* ── Summary strip ── */}
      {accounts.length > 0 && <SummaryStrip accounts={accounts} />}

      {/* ── Error banner ── */}
      {error && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle size={16} className="flex-shrink-0" />
          {error}
          <button onClick={load} className="ml-auto text-red-300 hover:text-red-200 text-xs underline">
            Retry
          </button>
        </div>
      )}

      {/* ── Table card (Desktop only) ── */}
      <div className="hidden md:block bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
        {/* Table toolbar */}
        {accounts.length > 0 && (
          <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-800">
            <div className="flex items-center gap-2 bg-slate-800/50 border border-slate-700/60 rounded-lg px-3 py-2 flex-1 max-w-xs">
              <Search size={14} className="text-slate-500 flex-shrink-0" />
              <input
                placeholder="Search by phone or username…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent text-sm text-slate-300 placeholder-slate-500 outline-none w-full"
              />
            </div>
            <span className="text-xs text-slate-600 ml-auto">
              {filtered.length} of {accounts.length}
            </span>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            {accounts.length > 0 && (
              <thead>
                <tr className="border-b border-slate-800">
                  {['Account', 'Phone', 'Groups', 'Posts Today', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {loading && accounts.length === 0 ? (
                [...Array(3)].map((_, i) => <SkeletonRow key={i} />)
              ) : filtered.length === 0 && !loading ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      icon={Send}
                      title="No accounts connected"
                      message="Connect your first Telegram account to start automating posts across groups."
                      action={{ label: 'Connect Account', onClick: () => setShowAdd(true) }}
                      color="blue"
                    />
                  </td>
                </tr>
              ) : (
                filtered.map((acc) => (
                  <tr
                    key={acc.id}
                    className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors group"
                  >
                    {/* Account */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600/30 to-indigo-600/30
                          border border-blue-500/30 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-blue-300">
                            {(acc.username ?? acc.phone ?? '?')[0].toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-slate-200 font-mono text-sm">
                            {acc.username ? `@${acc.username}` : '—'}
                          </p>
                          {acc.first_name && (
                            <p className="text-xs text-slate-500">{acc.first_name}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Phone */}
                    <td className="px-6 py-4">
                      <span className="text-slate-400 font-mono text-xs">{acc.phone ?? '—'}</span>
                    </td>

                    {/* Groups */}
                    <td className="px-6 py-4">
                      <span className="text-slate-300">{acc.groups_count ?? 0}</span>
                    </td>

                    {/* Posts today */}
                    <td className="px-6 py-4">
                      <span className="text-slate-300">{acc.posts_today ?? 0}</span>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <StatusDot status={dotStatus(acc)} pulse={acc.is_active} />
                        <Badge color={badgeColor(acc)}>{badgeLabel(acc)}</Badge>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {/* Toggle active */}
                        <button
                          onClick={() => handleToggle(acc)}
                          disabled={togglingId === acc.id}
                          title={acc.is_active ? 'Deactivate' : 'Activate'}
                          className={`p-2 rounded-lg transition-all ${
                            acc.is_active
                              ? 'text-emerald-400 hover:bg-emerald-500/10'
                              : 'text-slate-500 hover:bg-slate-800 hover:text-slate-300'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {togglingId === acc.id
                            ? <RefreshCw size={15} className="animate-spin" />
                            : acc.is_active
                              ? <Power size={15} />
                              : <PowerOff size={15} />
                          }
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => setDeleteTarget(acc)}
                          title="Remove account"
                          className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        {filtered.length > 0 && (
          <div className="px-6 py-3 border-t border-slate-800 flex items-center justify-between">
            <p className="text-xs text-slate-600">
              {filtered.length} account{filtered.length !== 1 ? 's' : ''} connected
            </p>
            <p className="text-xs text-slate-700">
              Last refreshed: just now
            </p>
          </div>
        )}
      </div>

      {/* ── Card view (Mobile only) ── */}
      <div className="md:hidden flex flex-col gap-4">
        {/* Mobile Toolbar */}
        {accounts.length > 0 && (
          <div className="flex items-center gap-3 bg-slate-900/40 border border-slate-800 p-3 rounded-2xl">
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 flex-1">
              <Search size={14} className="text-slate-500" />
              <input
                placeholder="Search phone or user..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent text-xs text-slate-300 outline-none w-full"
              />
            </div>
          </div>
        )}

        {loading && accounts.length === 0 ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-40 bg-slate-900/60 border border-slate-800 rounded-2xl animate-pulse" />
          ))
        ) : filtered.length === 0 && !loading ? (
          <EmptyState
            icon={Send}
            title="No accounts connected"
            message="Connect your first Telegram account to start automating posts across groups."
            action={{ label: 'Connect Account', onClick: () => setShowAdd(true) }}
            color="blue"
          />
        ) : (
          filtered.map((acc) => (
            <div key={acc.id} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center">
                    <span className="text-sm font-bold text-blue-400">
                      {(acc.username ?? acc.phone ?? '?')[0].toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-100">@{acc.username || 'unknown'}</p>
                    <p className="text-[10px] text-slate-500 font-mono">{acc.phone || 'No phone'}</p>
                  </div>
                </div>
                <Badge color={badgeColor(acc)} className="text-[9px] uppercase tracking-wider">{badgeLabel(acc)}</Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 py-3 border-y border-slate-800/50">
                <div className="flex flex-col items-center">
                  <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">Groups</p>
                  <p className="text-base font-black text-slate-100">{acc.groups_count ?? 0}</p>
                </div>
                <div className="flex flex-col items-center border-l border-slate-800/50">
                  <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">Today</p>
                  <p className="text-base font-black text-slate-100">{acc.posts_today ?? 0}</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                   <StatusDot status={dotStatus(acc)} pulse={acc.is_active} />
                   <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{acc.is_active ? 'Connected' : 'Offline'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggle(acc)}
                    disabled={togglingId === acc.id}
                    className="p-2.5 rounded-xl bg-slate-800/80 text-slate-400 hover:text-white transition-all"
                  >
                    {togglingId === acc.id ? <RefreshCw size={14} className="animate-spin" /> : <Power size={14} />}
                  </button>
                  <button
                    onClick={() => setDeleteTarget(acc)}
                    className="p-2.5 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Modals ── */}
      <AddAccountModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onOtpSent={handleOtpSent}
      />

      <OTPModal
        open={!!otpSession}
        onClose={() => setOtpSession(null)}
        session={otpSession}
        onVerified={handleVerified}
      />

      <ConfirmDeleteModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Remove Account"
        message={`Remove ${deleteTarget?.username ? '@' + deleteTarget.username : deleteTarget?.phone}? 
          This will terminate the session and stop all automations for this account.`}
      />
    </div>
  );
};

export default AccountsPage;
