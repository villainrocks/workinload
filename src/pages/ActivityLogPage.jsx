/* This code fixed By Tg:@ImxCodex */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Info, RefreshCw } from 'lucide-react';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { activityService } from '../services/activity.service';

const levelMap = {
  info: {
    color: 'blue',
    icon: Info,
  },
  warn: {
    color: 'yellow',
    icon: AlertTriangle,
  },
  error: {
    color: 'red',
    icon: AlertTriangle,
  },
};

const formatDateTime = (value) => {
  if (!value) return '';
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

const formatMeta = (meta) => {
  if (!meta || Object.keys(meta).length === 0) return '';
  return JSON.stringify(meta, null, 2);
};

const ActivityLogPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [level, setLevel] = useState('all');
  const [error, setError] = useState('');

  const filteredLogs = useMemo(() => {
    if (level === 'all') return logs;
    return logs.filter(item => item.level === level);
  }, [logs, level]);

  const fetchLogs = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const { data } = await activityService.getLogs(250);
      setLogs(data.logs || []);
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to load activity');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(() => fetchLogs(true), 5000);
    return () => clearInterval(interval);
  }, [fetchLogs]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Activity size={18} className="text-blue-400" />
            <h2 className="text-xl font-bold text-slate-100">Activity Logs</h2>
          </div>
          <p className="mt-1 text-xs text-slate-500">{filteredLogs.length} visible events</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {['all', 'info', 'warn', 'error'].map(item => (
            <button
              key={item}
              type="button"
              onClick={() => setLevel(item)}
              className={`h-9 rounded-lg border px-3 text-xs font-bold uppercase tracking-wider transition-colors ${
                level === item
                  ? 'border-blue-500/40 bg-blue-500/15 text-blue-300'
                  : 'border-slate-800 bg-slate-950/60 text-slate-500 hover:text-slate-200'
              }`}
            >
              {item}
            </button>
          ))}
          <Button variant="secondary" icon={RefreshCw} onClick={() => fetchLogs()} loading={loading}>
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <Card className="overflow-hidden">
        <Card.Body className="p-0">
          {loading && logs.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-sm text-slate-500">
              Loading activity...
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center gap-2 text-sm text-slate-500">
              <CheckCircle2 size={20} className="text-emerald-400" />
              No activity found
            </div>
          ) : (
            <div className="divide-y divide-slate-800/70">
              {filteredLogs.map((item) => {
                const levelConfig = levelMap[item.level] || levelMap.info;
                const Icon = levelConfig.icon;
                const meta = formatMeta(item.meta);

                return (
                  <div key={item.id} className="grid gap-3 p-4 hover:bg-slate-900/70 lg:grid-cols-[160px_1fr]">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Icon size={15} className={item.level === 'error' ? 'text-red-400' : item.level === 'warn' ? 'text-amber-400' : 'text-blue-400'} />
                      <span>{formatDateTime(item.timestamp)}</span>
                    </div>
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge color={levelConfig.color} className="text-[10px] uppercase">
                          {item.level}
                        </Badge>
                        <p className="min-w-0 flex-1 break-words text-sm font-semibold text-slate-200">
                          {item.message}
                        </p>
                      </div>
                      {meta && (
                        <pre className="max-h-32 overflow-auto rounded-lg border border-slate-800 bg-slate-950/70 p-3 text-[11px] leading-relaxed text-slate-400">
                          {meta}
                        </pre>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default ActivityLogPage;
