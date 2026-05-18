/* This code fixed By Tg:@ImxCodex */
import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Save, CheckCircle2, RefreshCw, Timer, Square, User, Users, ChevronDown, ChevronUp } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { telegramService } from '../services/telegram.service';
import { groupsService } from '../services/groups.service';
import { useToast } from '../context/ToastContext';

const NumberDropPage = () => {
  const toast = useToast();
  
  // Data
  const [accounts, setAccounts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // UI State
  const [activeTab, setActiveTab] = useState('execute'); // 'execute' or 'config'
  const [collapsedConfigs, setCollapsedConfigs] = useState(new Set());
  
  // Config Form State (Local changes before saving)
  const [localConfigs, setLocalConfigs] = useState({});
  const [savingConfig, setSavingConfig] = useState(false);
  const [targetSearch, setTargetSearch] = useState({});
  const [syncing, setSyncing] = useState(false);

  // Execution State
  const [selectedAccounts, setSelectedAccounts] = useState(new Set());
  const [broadcasting, setBroadcasting] = useState(false);
  const [sendingState, setSendingState] = useState({ active: false, status: '', progress: 0, total: 0 });
  
  // Refs for loop
  const isCancelledRef = useRef(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [accRes, grpRes] = await Promise.all([
        telegramService.getAccounts(),
        groupsService.getAll()
      ]);
      
      const accsData = accRes.data?.data || accRes.data || {};
      const grpsData = grpRes.data?.data || grpRes.data || {};
      
      const accs = Array.isArray(accsData) ? accsData : (accsData.accounts || accsData.data || []);
      const grps = Array.isArray(grpsData) ? grpsData : (grpsData.groups || grpsData.data || []);
      
      setAccounts(accs);
      setGroups(grps);
      
      // Initialize local configs with db data
      const initConfigs = {};
      accs.forEach(acc => {
        initConfigs[acc.id] = {
          bank_account_number: acc.bank_account_number || '',
          drop_targets: Array.isArray(acc.drop_targets) ? acc.drop_targets : (typeof acc.drop_targets === 'string' ? JSON.parse(acc.drop_targets || '[]') : []),
        };
      });
      setLocalConfigs(initConfigs);
      
    } catch (error) {
      toast.error('Failed to load accounts and groups');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSync = async (accountId) => {
    setSyncing(true);
    try {
      await groupsService.sync(accountId);
      toast.success('Groups synced successfully');
      await fetchData(); // Refresh everything
    } catch (err) {
      console.error('Sync failed', err);
      toast.error('Failed to sync groups');
    } finally {
      setSyncing(false);
    }
  };

  // --- CONFIGURATION METHODS ---
  const handleConfigChange = (accountId, field, value) => {
    let finalValue = value;
    
    // Add validation for bank_account_number: max 9 digits
    if (field === 'bank_account_number') {
      // Allow only digits and limit to 9
      finalValue = value.replace(/\D/g, '').slice(0, 9);
    }

    setLocalConfigs(prev => ({
      ...prev,
      [accountId]: {
        ...prev[accountId],
        [field]: finalValue
      }
    }));
  };

  const toggleTargetForAccount = (accountId, groupId) => {
    setLocalConfigs(prev => {
      const currentTargets = prev[accountId]?.drop_targets || [];
      const newTargets = currentTargets.includes(groupId)
        ? currentTargets.filter(id => id !== groupId)
        : [...currentTargets, groupId];
        
      return {
        ...prev,
        [accountId]: {
          ...prev[accountId],
          drop_targets: newTargets
        }
      };
    });
  };

  const selectAllForAccount = (accountId, filteredGroups) => {
    setLocalConfigs(prev => {
      const currentTargets = prev[accountId]?.drop_targets || [];
      const newTargets = new Set([...currentTargets, ...filteredGroups.map(g => g.id)]);
      return {
        ...prev,
        [accountId]: {
          ...prev[accountId],
          drop_targets: Array.from(newTargets)
        }
      };
    });
  };

  const deselectAllForAccount = (accountId, filteredGroups) => {
    setLocalConfigs(prev => {
      const currentTargets = prev[accountId]?.drop_targets || [];
      const idsToRemove = new Set(filteredGroups.map(g => g.id));
      const newTargets = currentTargets.filter(id => !idsToRemove.has(id));
      return {
        ...prev,
        [accountId]: {
          ...prev[accountId],
          drop_targets: newTargets
        }
      };
    });
  };

  const saveConfig = async (accountId) => {
    try {
      setSavingConfig(accountId);
      const config = localConfigs[accountId];
      await telegramService.updateAccountConfig(accountId, {
        bank_account_number: config.bank_account_number,
        drop_targets: config.drop_targets
      });
      
      // Update local accounts array so we don't need a full refetch
      setAccounts(prev => prev.map(a => 
        a.id === accountId ? { ...a, bank_account_number: config.bank_account_number, drop_targets: config.drop_targets } : a
      ));
      
      toast.success('Configuration saved!');
    } catch {
      toast.error('Failed to save configuration');
    } finally {
      setSavingConfig(false);
    }
  };

  const toggleConfigCollapse = (accountId) => {
    setCollapsedConfigs(prev => {
      const next = new Set(prev);
      if (next.has(accountId)) next.delete(accountId);
      else next.add(accountId);
      return next;
    });
  };

  // --- EXECUTION METHODS ---
  const toggleAccountSelection = (accountId) => {
    setSelectedAccounts(prev => {
      const next = new Set(prev);
      if (next.has(accountId)) next.delete(accountId);
      else next.add(accountId);
      return next;
    });
  };

  const shuffleArray = (array) => {
    const newArr = [...array];
    for (let i = newArr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
  };

  const cancelSending = () => {
    isCancelledRef.current = true;
    setSendingState({ active: false, status: 'Cancelled', progress: 0, total: 0 });
    setBroadcasting(false);
    toast.warning('Drop sequence cancelled.');
  };

  const startDropSequence = async () => {
    if (selectedAccounts.size === 0) {
      return toast.warning('Select at least one account to drop from.');
    }

    // 1. Build task list
    let tasks = [];
    for (const accountId of selectedAccounts) {
      const acc = accounts.find(a => a.id === accountId);
      if (!acc) continue;
      
      const config = localConfigs[accountId] || {};
      const targets = config.drop_targets || [];
      const numberToDrop = config.bank_account_number;
      
      if (!numberToDrop || numberToDrop.trim() === '') {
        toast.warning(`Skipped ${acc.username || acc.phone}: No account number configured.`);
        continue;
      }
      
      if (targets.length === 0) {
        toast.warning(`Skipped ${acc.username || acc.phone}: No targets configured.`);
        continue;
      }
      
      for (const targetId of targets) {
        tasks.push({
          accountId,
          targetId,
          number: numberToDrop.trim(),
          accountDisplay: acc.username ? `@${acc.username}` : acc.phone,
        });
      }
    }
    
    if (tasks.length === 0) {
      return toast.error('No valid targets/numbers found for selected accounts. Please configure them first.');
    }

    // 2. Shuffle tasks for random human-like behavior
    tasks = shuffleArray(tasks);
    
    // 3. Execute Loop
    isCancelledRef.current = false;
    setBroadcasting(true);
    setSendingState({ active: true, status: 'Starting drop sequence...', progress: 0, total: tasks.length });
    
    let successCount = 0;
    
    for (let i = 0; i < tasks.length; i++) {
      if (isCancelledRef.current) break;
      
      const task = tasks[i];
      setSendingState({ active: true, status: `Sending from ${task.accountDisplay}...`, progress: i, total: tasks.length });
      
      try {
        await telegramService.broadcast({
          targets: [{ accountId: task.accountId, groupIds: [task.targetId] }],
          text: task.number
        });
        successCount++;
      } catch (error) {
        console.error(`Failed to drop for ${task.accountDisplay}:`, error);
      }
      
      // Wait randomly between 2 and 15 seconds if it's not the last one
      if (i < tasks.length - 1 && !isCancelledRef.current) {
        const waitMs = Math.floor(Math.random() * (15000 - 2000 + 1)) + 2000;
        setSendingState({ active: true, status: `Waiting ${(waitMs/1000).toFixed(1)}s...`, progress: i + 1, total: tasks.length });
        await new Promise(r => setTimeout(r, waitMs));
      }
    }
    
    if (!isCancelledRef.current) {
      toast.success(`Sequence complete! Successfully dropped ${successCount}/${tasks.length} times.`);
      setSendingState({ active: false, status: '', progress: 0, total: 0 });
      setBroadcasting(false);
    }
  };

  const getAccountDisplay = (acc) => {
    const full = [acc.first_name, acc.last_name].filter(Boolean).join(' ');
    return full || (acc.username ? `@${acc.username}` : acc.phone);
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-400">Loading accounts...</div>;
  }

  return (
    <div className="flex flex-col gap-6 pb-12 animate-fade-in max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Number Drop</h2>
          <p className="text-slate-400 text-sm mt-1">Randomized, human-like account number distribution.</p>
        </div>
        
        {sendingState.active && (
          <div className="flex items-center gap-3 bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-2xl shadow-[0_0_15px_rgba(59,130,246,0.1)]">
            <Timer size={18} className="text-blue-400 animate-pulse" />
            <span className="text-blue-400 text-sm font-semibold whitespace-nowrap">
              [{sendingState.progress}/{sendingState.total}] {sendingState.status}
            </span>
            <button onClick={cancelSending} className="ml-2 p-1 hover:bg-blue-500/20 rounded-lg text-blue-400 transition-colors">
              <Square size={14} fill="currentColor" />
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800">
        <button
          onClick={() => setActiveTab('execute')}
          className={`px-6 py-3 text-sm font-bold tracking-wider uppercase transition-colors border-b-2 ${
            activeTab === 'execute' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          Execute Drop
        </button>
        <button
          onClick={() => setActiveTab('config')}
          className={`px-6 py-3 text-sm font-bold tracking-wider uppercase transition-colors border-b-2 ${
            activeTab === 'config' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          Configuration
        </button>
      </div>

      {/* --- EXECUTE TAB --- */}
      {activeTab === 'execute' && (
        <div className="space-y-6">
          <Card className="border-slate-800/50 bg-slate-900/20 backdrop-blur-sm">
            <Card.Header className="border-b border-slate-800/50 py-4">
              <div className="flex items-center gap-2">
                <Play size={18} className="text-emerald-400" />
                <span className="text-slate-200 font-bold">Select Accounts to Drop From</span>
              </div>
            </Card.Header>
            <Card.Body className="p-4 space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {accounts.map(acc => {
                  const isSelected = selectedAccounts.has(acc.id);
                  const config = localConfigs[acc.id] || {};
                  const isReady = config.bank_account_number && config.drop_targets?.length > 0;
                  
                  return (
                    <button
                      key={acc.id}
                      onClick={() => isReady ? toggleAccountSelection(acc.id) : toast.error('Configure this account first!')}
                      className={`relative flex flex-col items-center p-4 rounded-2xl border transition-all ${
                        isSelected
                          ? 'bg-emerald-500/10 border-emerald-500/50 shadow-lg shadow-emerald-500/5'
                          : isReady 
                            ? 'bg-slate-800/30 border-slate-700/50 hover:border-slate-600'
                            : 'bg-slate-900/50 border-slate-800/50 opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 transition-all ${
                        isSelected ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-500'
                      }`}>
                        <User size={20} />
                      </div>
                      <p className={`text-sm font-bold truncate w-full text-center ${isSelected ? 'text-emerald-400' : 'text-slate-300'}`}>
                        {getAccountDisplay(acc)}
                      </p>
                      {isReady ? (
                        <p className="text-[10px] text-slate-500 mt-1">{config.drop_targets.length} targets configured</p>
                      ) : (
                        <p className="text-[10px] text-red-400/80 mt-1">Not configured</p>
                      )}
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-2 h-2 bg-emerald-500 rounded-full" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-slate-800/50 flex justify-end">
                <Button 
                  icon={Play} 
                  onClick={startDropSequence} 
                  loading={broadcasting}
                  disabled={selectedAccounts.size === 0 || broadcasting}
                  className="bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-500/20 px-8"
                >
                  Start Sequence
                </Button>
              </div>
            </Card.Body>
          </Card>
          
          <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-4 text-sm text-slate-400">
            <p className="font-bold text-slate-300 mb-1">How it works:</p>
            <p>The system gathers all selected accounts and their configured targets. It shuffles them completely randomly, and sends the fixed Account Number to one target at a time, pausing randomly for 2 to 15 seconds between each message. This ensures the activity looks completely human and prevents rate limits.</p>
          </div>
        </div>
      )}

      {/* --- CONFIG TAB --- */}
      {activeTab === 'config' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-2">
            <p className="text-slate-400 text-sm">Set up the fixed bank account number and target groups for each Telegram account.</p>
          </div>
          
          {accounts.map(acc => {
            const config = localConfigs[acc.id] || { bank_account_number: '', drop_targets: [] };
            const isCollapsed = collapsedConfigs.has(acc.id);
            const rawAccGroups = groups.filter(g => String(g.account_id) === String(acc.id));
            
            const searchTerms = (targetSearch[acc.id] || '').toLowerCase().trim();
            const accGroups = searchTerms
              ? rawAccGroups.filter(g => (g.title || '').toLowerCase().includes(searchTerms) || (g.username || '').toLowerCase().includes(searchTerms))
              : rawAccGroups;

            const selectedCount = config.drop_targets.length;
            const isAllSelected = accGroups.length > 0 && accGroups.every(g => config.drop_targets.includes(g.id));

            return (
              <div key={acc.id} className="group border border-slate-800/60 rounded-2xl bg-slate-900/40 overflow-hidden transition-all hover:border-slate-700">
                <div className="flex flex-col md:flex-row md:items-center justify-between p-3 sm:p-4 bg-slate-800/20 gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 flex-shrink-0">
                      <User size={20} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm sm:text-base font-bold text-slate-200 truncate">{getAccountDisplay(acc)}</p>
                      <p className="text-[10px] sm:text-xs text-slate-500">
                        {config.bank_account_number ? '✓ Number Set' : '✗ No Number'} • {selectedCount} Targets
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between md:justify-end gap-1 sm:gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800/50">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleSync(acc.id)}
                        disabled={syncing}
                        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition-all"
                        title="Sync Groups"
                      >
                        <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
                        <span className="hidden sm:inline">Sync</span>
                      </button>
                      
                      <button
                        onClick={() => isAllSelected ? deselectAllForAccount(acc.id, accGroups) : selectAllForAccount(acc.id, accGroups)}
                        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider text-blue-400 hover:bg-blue-400/10 transition-all"
                        title={isAllSelected ? 'Deselect All' : 'Select All'}
                      >
                        <Users size={12} />
                        <span>{isAllSelected ? 'None' : 'All'}</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1 border-l border-slate-800 pl-1">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => saveConfig(acc.id)}
                        loading={savingConfig === acc.id}
                        icon={Save}
                        className="text-emerald-400 hover:bg-emerald-400/10 px-2"
                      >
                        <span className="text-[10px] font-bold uppercase tracking-wider">Save</span>
                      </Button>
                      
                      <button
                        onClick={() => toggleConfigCollapse(acc.id)}
                        className="p-2 rounded-lg hover:bg-slate-700 text-slate-500 transition-all"
                      >
                        {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                      </button>
                    </div>
                  </div>
                </div>

                {!isCollapsed && (
                  <div className="p-4 pt-0 space-y-4 border-t border-slate-800/30">
                    <div className="max-w-md mt-4">
                      <Input 
                        label="Bank Account Number to Drop"
                        placeholder="e.g. 981234567"
                        value={config.bank_account_number}
                        onChange={(e) => handleConfigChange(acc.id, 'bank_account_number', e.target.value)}
                        className="bg-slate-950 border-slate-800"
                        maxLength={9}
                        inputMode="numeric"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2">
                        Select Permanent Targets
                      </label>
                      <div className="relative my-3">
                        <Input
                          placeholder="Search groups or users..."
                          value={targetSearch[acc.id] || ''}
                          onChange={(e) => setTargetSearch(prev => ({ ...prev, [acc.id]: e.target.value }))}
                          className="pl-9 py-2 text-xs bg-slate-950/50 border-slate-800"
                        />
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                        </div>
                      </div>

                      {accGroups.length === 0 ? (
                        <div className="py-8 text-center border border-dashed border-slate-800 rounded-xl">
                          <p className="text-xs text-slate-600">
                            {rawAccGroups.length === 0 ? "No groups found. Please sync this account." : "No matching targets found."}
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                          {accGroups.map(g => {
                            const isSelected = config.drop_targets.includes(g.id);
                            const isUser = g.type === 'private' || g.isUser;
                            
                            return (
                              <label
                                key={g.id}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer border transition-all ${
                                  isSelected
                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                    : 'bg-slate-950/20 border-transparent text-slate-500 hover:border-slate-800'
                                }`}
                              >
                                <div className={`w-4 h-4 rounded-lg border flex items-center justify-center flex-shrink-0 transition-all ${
                                  isSelected ? 'bg-emerald-500 border-emerald-500' : 'border-slate-700'
                                }`}>
                                  {isSelected && <CheckCircle2 size={10} className="text-white" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    {isUser ? <User size={10} className="opacity-50" /> : <Users size={10} className="opacity-50" />}
                                    <p className="text-xs font-medium truncate">{g.title || g.username || 'Unknown'}</p>
                                  </div>
                                  <p className="text-[9px] text-slate-600 uppercase font-bold tracking-tighter ml-4">{g.type}</p>
                                </div>
                                <input 
                                  type="checkbox" 
                                  className="hidden" 
                                  checked={isSelected} 
                                  onChange={() => toggleTargetForAccount(acc.id, g.id)} 
                                />
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default NumberDropPage;
