/* This code fixed By Tg:@ImxCodex */
import { useState, useEffect, useCallback } from 'react';
import { UserPlus, Trash2, Shield, User, Mail, LogOut, ChevronRight, Settings2, FileText, Zap, Radio, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { userService } from '../services/user.service';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

const PERMISSION_DEFS = [
  { key: 'can_generate',        label: 'Generate Receipts', icon: FileText, desc: 'Access to the receipt generator' },
  { key: 'can_broadcast',       label: 'Broadcast',         icon: Radio,    desc: 'Send receipts via Telegram' },
  { key: 'can_manage_accounts', label: 'Manage Accounts',   icon: Users,    desc: 'Add and remove Telegram accounts' },
  { key: 'can_view_logs',       label: 'View Logs',         icon: Zap,      desc: 'Access the activity log page' },
];

const DEFAULT_USER_PERMS = {
  can_generate: true,
  can_broadcast: true,
  can_manage_accounts: true,
  can_view_logs: false,
};

const PermissionToggle = ({ label, desc, icon: Icon, enabled, onChange, disabled }) => (
  <div className={`flex items-center justify-between p-3 rounded-xl border transition-all ${enabled ? 'border-blue-500/30 bg-blue-500/5' : 'border-slate-800/50 bg-slate-900/20'} ${disabled ? 'opacity-50' : ''}`}>
    <div className="flex items-center gap-3">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${enabled ? 'bg-blue-500/15 text-blue-400' : 'bg-slate-800 text-slate-500'}`}>
        <Icon size={15} />
      </div>
      <div>
        <p className="text-xs font-bold text-slate-200">{label}</p>
        <p className="text-[10px] text-slate-500">{desc}</p>
      </div>
    </div>
    <button
      type="button"
      disabled={disabled}
      onClick={() => !disabled && onChange(!enabled)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${enabled ? 'bg-blue-600' : 'bg-slate-700'} ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
    </button>
  </div>
);

const UsersPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loggingOut, setLoggingOut] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [permModal, setPermModal] = useState(null);
  const [permState, setPermState] = useState({});
  const [savingPerms, setSavingPerms] = useState(false);
  const [formData, setFormData] = useState({ username: '', email: '', password: '', role: 'user' });
  const toast = useToast();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await userService.getAll();
      setUsers(data);
    } catch {
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (user?.role === 'admin') fetchUsers();
  }, [fetchUsers, user?.role]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await userService.create(formData);
      toast.success('User created successfully');
      setShowModal(false);
      setFormData({ username: '', email: '', password: '', role: 'user' });
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to create user');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    setDeletingId(id);
    try {
      await userService.delete(id);
      toast.success('User deleted');
      setUsers(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to delete user');
    } finally {
      setDeletingId(null);
    }
  };

  const openPermModal = (u) => {
    const defaults = u.role === 'admin'
      ? { can_generate: true, can_broadcast: true, can_manage_accounts: true, can_view_logs: true }
      : DEFAULT_USER_PERMS;
    setPermState({ ...defaults, ...(u.permissions || {}) });
    setPermModal(u);
  };

  const handleSavePerms = async () => {
    if (!permModal) return;
    setSavingPerms(true);
    try {
      const { data } = await userService.updatePermissions(permModal.id, permState);
      toast.success('Permissions updated');
      setUsers(prev => prev.map(u => u.id === permModal.id ? { ...u, permissions: data.permissions } : u));
      setPermModal(null);
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to update permissions');
    } finally {
      setSavingPerms(false);
    }
  };

  const handleLogout = async () => {
    if (!window.confirm('Are you sure you want to logout?')) return;
    setLoggingOut(true);
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch {
      toast.error('Logout failed');
      setLoggingOut(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">User Management</h2>
          <p className="text-slate-400 text-sm mt-1">Create and manage access for your team members.</p>
        </div>
        <Button icon={UserPlus} onClick={() => setShowModal(true)} className="shadow-lg shadow-blue-500/20">
          Add New User
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse h-40 bg-slate-800/20" />
          ))
        ) : (
          users.map(u => (
            <Card key={u.id} className="border-slate-800/50 bg-slate-900/20 backdrop-blur-sm group hover:border-slate-700 transition-all">
              <Card.Body className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${u.role === 'admin' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-400'}`}>
                      {u.role === 'admin' ? <Shield size={20} /> : <User size={20} />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-100">{u.username}</p>
                      <p className="text-xs text-slate-500 truncate max-w-[150px]">{u.email}</p>
                    </div>
                  </div>
                  <Badge color={u.role === 'admin' ? 'amber' : 'blue'} className="uppercase text-[8px] font-black tracking-widest">
                    {u.role}
                  </Badge>
                </div>

                {u.role !== 'admin' && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {PERMISSION_DEFS.map(({ key, label }) => {
                      const defaults = DEFAULT_USER_PERMS;
                      const active = u.permissions ? !!u.permissions[key] : !!defaults[key];
                      return (
                        <span key={key} className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md ${active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-600'}`}>
                          {label}
                        </span>
                      );
                    })}
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-slate-800/50">
                  <span className="text-[10px] text-slate-600 font-medium italic">
                    Joined {new Date(u.created_at).toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-1">
                    {u.id !== user?.id && u.role !== 'admin' && (
                      <button
                        onClick={() => openPermModal(u)}
                        className="p-2 text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all"
                        title="Manage permissions"
                      >
                        <Settings2 size={15} />
                      </button>
                    )}
                    {u.id !== user?.id && (
                      <button
                        onClick={() => handleDelete(u.id)}
                        disabled={deletingId === u.id}
                        className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                        title="Delete user"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              </Card.Body>
            </Card>
          ))
        )}
      </div>

      <div className="mt-8 pt-8 border-t border-slate-800">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 mb-4 px-1">Session Management</h3>
        <Card className="border-red-500/20 bg-red-500/5 backdrop-blur-sm overflow-hidden">
          <Card.Body className="p-0">
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="w-full flex items-center justify-between p-4 text-red-400 hover:bg-red-500/10 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center shadow-inner shadow-red-500/5">
                  <LogOut size={22} />
                </div>
                <div className="text-left">
                  <p className="text-base font-bold tracking-tight">Sign Out</p>
                  <p className="text-[10px] text-red-500/60 uppercase font-black tracking-widest mt-0.5">
                    {loggingOut ? 'Terminating session...' : 'Close current session'}
                  </p>
                </div>
              </div>
              <div className="bg-red-500/10 p-2 rounded-xl">
                <ChevronRight size={18} className="opacity-60" />
              </div>
            </button>
          </Card.Body>
        </Card>
      </div>

      {/* Create User Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Create New User" size="md">
        <form onSubmit={handleCreate} className="flex flex-col gap-5">
          <Input label="Username" icon={User} placeholder="e.g. john_doe" required value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} />
          <Input label="Email Address" type="email" icon={Mail} placeholder="e.g. john@example.com" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
          <Input label="Initial Password" type="password" placeholder="Min. 6 characters" required value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-500 font-bold uppercase tracking-widest">Assign Role</label>
            <select
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:border-blue-500 transition-colors outline-none"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            >
              <option value="user">Standard User</option>
              <option value="admin">Administrator</option>
            </select>
            <p className="text-[10px] text-slate-600">Admins have full access. User permissions can be customized after creation.</p>
          </div>
          <div className="flex gap-3 pt-4">
            <Button variant="ghost" className="flex-1" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500">Create Account</Button>
          </div>
        </form>
      </Modal>

      {/* Permissions Modal */}
      <Modal open={!!permModal} onClose={() => setPermModal(null)} title={`Permissions — ${permModal?.username}`} size="md">
        <div className="flex flex-col gap-3">
          <p className="text-xs text-slate-500 mb-1">Toggle which features this user can access.</p>
          {PERMISSION_DEFS.map(({ key, label, desc, icon }) => (
            <PermissionToggle
              key={key}
              label={label}
              desc={desc}
              icon={icon}
              enabled={!!permState[key]}
              onChange={(val) => setPermState(prev => ({ ...prev, [key]: val }))}
            />
          ))}
          <div className="flex gap-3 pt-4">
            <Button variant="ghost" className="flex-1" onClick={() => setPermModal(null)}>Cancel</Button>
            <Button className="flex-1 bg-blue-600 hover:bg-blue-500" onClick={handleSavePerms} disabled={savingPerms}>
              {savingPerms ? 'Saving...' : 'Save Permissions'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UsersPage;
