/* This code fixed By Tg:@ImxCodex */
import { useState, useEffect } from 'react';
import { Play, Eye, RotateCcw, CheckCircle2, Send, RefreshCw, User, Users, Clock, Timer, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Square, ImageIcon, XCircle } from 'lucide-react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { templateService } from '../services/template.service';
import { telegramService } from '../services/telegram.service';
import { groupsService } from '../services/groups.service';
import { configService } from '../services/config.service';
import { useToast } from '../context/ToastContext';
import { toArray } from '../utils/helpers';
import { remapTargetIdsForAccount } from '../utils/telegramTargets';
import Modal from '../components/ui/Modal';
import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  assertBroadcastSucceeded,
  bookingDelayOptions,
  buildJournalNo,
  buildRandomBookingNo,
  buildRandomPurpose,
  buildSchedulePlan,
  formatReceiptPayload,
  getAccountDisplay,
  getBhutanDateTime,
  getBhutanDateTimeAfterSeconds,
  getRandomFrame,
  getRandomResolution,
  receiptScheduleOptions,
  randomDigits,
} from '../features/broadcast/broadcast.utils';

const clearTimerRef = (ref) => {
  if (ref.current) {
    clearTimeout(ref.current);
    ref.current = null;
  }
};

const GeneratorPage = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previews, setPreviews] = useState([]); // Array of { accountId, url, resolution }
  const [activePreviewIndex, setActivePreviewIndex] = useState(0);
  const [broadcasting, setBroadcasting] = useState(false);

  // Telegram data
  const [accounts, setAccounts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [showReview, setShowReview] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Multi-source selection: which accounts are selected as SENDER
  const [selectedSourceAccounts, setSelectedSourceAccounts] = useState(new Set());

  // Targets per source account: { accountId: Set(groupIds) }
  const [targetsBySource, setTargetsBySource] = useState({});

  // For manual targets input
  const [manualTargets, setManualTargets] = useState('');

  // Target search per account
  const [targetSearch, setTargetSearch] = useState({});

  const [sendingState, setSendingState] = useState({ active: false, status: '' });
  const [collapsedAccounts, setCollapsedAccounts] = useState(new Set());
  const [amountsBySource, setAmountsBySource] = useState({});
  const [fromAccountsBySource, setFromAccountsBySource] = useState({});
  const [datesBySource, setDatesBySource] = useState({});
  const [timesBySource, setTimesBySource] = useState({});
  const [toAccountsBySource, setToAccountsBySource] = useState({});
  const [receiptDelaysBySource, setReceiptDelaysBySource] = useState({});
  const [bookingDelaysBySource, setBookingDelaysBySource] = useState({});
  const [isMultiSelect, setIsMultiSelect] = useState(false);
  const [focusedAccountId, setFocusedAccountId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const timerRef = useRef(null);
  const bookingTimerRef = useRef(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      clearTimerRef(timerRef);
      clearTimerRef(bookingTimerRef);
    };
  }, []);

  const toggleAccountCollapse = (accountId) => {
    setCollapsedAccounts(prev => {
      const next = new Set(prev);
      if (next.has(accountId)) next.delete(accountId);
      else next.add(accountId);
      return next;
    });
  };

  const saveGlobalJournalNo = async () => {
    setLoading(true);
    try {
      // Save all global fields to the 'global' config row
      await configService.saveAccountConfig('global', [], {
        journalNo: formData.journalNo,
        toAccount: formData.toAccount,
        receiptDelayRange: formData.receiptDelayRange,
        bookingDelayRange: formData.bookingDelayRange,
      });
      toast.success('Global config saved');
    } catch (err) {
      console.error('Failed to save global config', err);
      toast.error('Failed to save global config');
    } finally {
      setLoading(false);
    }
  };

  const loadGlobalConfig = async () => {
    try {
      const { data } = await configService.getAccountConfig('global');
      if (data && data.defaults) {
        setFormData(prev => ({ 
          ...prev, 
          journalNo: data.defaults.journalNo || prev.journalNo,
          fromAccount: data.defaults.fromAccount || prev.fromAccount,
          toAccount: data.defaults.toAccount || prev.toAccount,
          amount: data.defaults.amount || prev.amount,
          receiptDelayRange: data.defaults.receiptDelayRange || prev.receiptDelayRange,
          bookingDelayRange: data.defaults.bookingDelayRange || prev.bookingDelayRange,
        }));
      }
    } catch (err) {
      console.error('Failed to load global config', err);
    }
  };

  // Load saved configs for ALL accounts on mount
  const loadAllAccountConfigs = async (accountsList) => {
    for (const acc of accountsList) {
      try {
        const { data } = await configService.getAccountConfig(acc.id);
        if (data) {
          const { targets, defaults } = data;
          if (targets && targets.length > 0) {
            setTargetsBySource(prev => ({ ...prev, [acc.id]: new Set(targets) }));
          }
          if (defaults?.amount) {
            setAmountsBySource(prev => ({ ...prev, [acc.id]: defaults.amount }));
          }
          if (defaults?.fromAccount) {
            setFromAccountsBySource(prev => ({ ...prev, [acc.id]: defaults.fromAccount }));
          }
          if (defaults?.date) {
            setDatesBySource(prev => ({ ...prev, [acc.id]: defaults.date }));
          }
          if (defaults?.time) {
            setTimesBySource(prev => ({ ...prev, [acc.id]: defaults.time }));
          }
          if (defaults?.toAccount) {
            setToAccountsBySource(prev => ({ ...prev, [acc.id]: defaults.toAccount }));
          }
          if (defaults?.receiptDelayRange) {
            setReceiptDelaysBySource(prev => ({ ...prev, [acc.id]: defaults.receiptDelayRange }));
          }
          if (defaults?.bookingDelayRange) {
            setBookingDelaysBySource(prev => ({ ...prev, [acc.id]: defaults.bookingDelayRange }));
          }
        }
      } catch (err) {
        console.error(`Failed to load config for account ${acc.id}`, err);
      }
    }
  };

  const cancelSending = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (bookingTimerRef.current) clearTimeout(bookingTimerRef.current);
    setBroadcasting(false);
    setSendingState({ active: false, status: '' });
    toast.info('Sending process cancelled');
  };

  const fetchData = async () => {
    try {
      const [accRes, grpRes] = await Promise.all([
        telegramService.getAccounts(),
        groupsService.getAll()
      ]);
      const accountsList = toArray(accRes?.data?.accounts, accRes?.data?.items, accRes?.data);
      setAccounts(accountsList);
      setGroups(toArray(grpRes?.data?.groups, grpRes?.data?.items, grpRes?.data));
      // Load saved per-account configs for every account
      await loadAllAccountConfigs(accountsList);
    } catch (err) {
      console.error('Failed to fetch Telegram data', err);
    }
  };

  useEffect(() => {
    fetchData();
    loadGlobalConfig();
    generateBookingNo();
    generatePurpose();
    
    // Initialize receipt fields with Bhutan time.
    const { date, time } = getBhutanDateTime();
    setFormData(prev => ({ ...prev, date, time }));
    // The initial load intentionally runs once so it does not overwrite in-progress edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSync = async (accountId = null) => {
    setSyncing(true);
    try {
      const selectedIds = Array.from(selectedSourceAccounts);
      const accountIds = accountId
        ? [accountId]
        : selectedIds.length > 0
          ? selectedIds
          : [null];

      const failures = [];
      for (const id of accountIds) {
        try {
          await groupsService.sync(id);
        } catch (err) {
          failures.push(err);
        }
      }
      await fetchData();
      if (failures.length > 0) {
        const firstMessage = failures[0].response?.data?.message || failures[0].message || 'Failed to sync groups';
        toast.error(accountIds.length > 1 ? `${failures.length} account sync failed. ${firstMessage}` : firstMessage);
      } else {
        toast.success(accountIds.length > 1 ? 'Selected account groups synced' : 'Groups synced successfully');
      }
    } catch (err) {
      console.error('Sync failed', err);
      const message = err.response?.data?.message || err.message || 'Failed to sync groups';
      toast.error(message);
    } finally {
      setSyncing(false);
    }
  };

  // Toggle source account selection
  const toggleSourceAccount = async (accountId) => {
    if (!isMultiSelect) {
      // Single select mode: Switch focus and selection
      setSelectedSourceAccounts(new Set([accountId]));
      setFocusedAccountId(accountId);
      loadAccountConfig(accountId);
      return;
    }

    // Multi select mode: Toggle in/out
    setSelectedSourceAccounts(prev => {
      const next = new Set(prev);
      if (next.has(accountId)) {
        next.delete(accountId);
        if (focusedAccountId === accountId) setFocusedAccountId(null);
      } else {
        next.add(accountId);
        setFocusedAccountId(accountId);
        loadAccountConfig(accountId);
      }
      return next;
    });
  };

  const hasAccountOverride = (map, accountId) => (
    accountId !== undefined &&
    accountId !== null &&
    Object.prototype.hasOwnProperty.call(map, accountId)
  );

  const getAccountById = (accountId) => (
    accounts.find(account => String(account.id) === String(accountId))
  );

  const getAccountDefaults = (accountId, dataUpdates = {}) => {
    const account = getAccountById(accountId);
    return {
      amount: hasAccountOverride(amountsBySource, accountId) ? amountsBySource[accountId] : formData.amount,
      fromAccount: hasAccountOverride(fromAccountsBySource, accountId)
        ? fromAccountsBySource[accountId]
        : account?.bank_account_number || formData.fromAccount,
      date: hasAccountOverride(datesBySource, accountId) ? datesBySource[accountId] : formData.date,
      time: hasAccountOverride(timesBySource, accountId) ? timesBySource[accountId] : formData.time,
      toAccount: hasAccountOverride(toAccountsBySource, accountId) ? toAccountsBySource[accountId] : formData.toAccount,
      receiptDelayRange: hasAccountOverride(receiptDelaysBySource, accountId) ? receiptDelaysBySource[accountId] : formData.receiptDelayRange,
      bookingDelayRange: hasAccountOverride(bookingDelaysBySource, accountId) ? bookingDelaysBySource[accountId] : formData.bookingDelayRange,
      purpose: formData.purpose,
      journalNo: formData.journalNo,
      ...dataUpdates,
    };
  };

  const autoSaveToDB = async (dataUpdates, accountId = null) => {
    const accountsToUpdate = accountId
      ? [accountId]
      : isMultiSelect
        ? Array.from(selectedSourceAccounts)
        : [focusedAccountId].filter(Boolean);
    
    if (accountsToUpdate.length === 0) return;

    setIsSaving(true);
    try {
      const promises = accountsToUpdate.map(accId => {
        const targets = targetsBySource[accId] ? Array.from(targetsBySource[accId]) : [];
        const defaults = getAccountDefaults(accId, dataUpdates);
        return configService.saveAccountConfig(accId, targets, defaults);
      });
      await Promise.all(promises);
      setTimeout(() => setIsSaving(false), 500);
    } catch (err) {
      console.error('Auto-save failed', err);
      setIsSaving(false);
    }
  };

  // Debounced change handler
  const handleFieldChange = (name, value) => {
    // Update local state first
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Auto-save logic
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      autoSaveToDB({ [name]: value });
    }, 1000);
  };

  const handleAmountChange = (accountId, val) => {
    const targetId = accountId || focusedAccountId;
    if (!targetId) {
      setFormData(prev => ({ ...prev, amount: val }));
      return;
    }
    
    setAmountsBySource(prev => ({ ...prev, [targetId]: val }));
    if (targetId === focusedAccountId) setFormData(prev => ({ ...prev, amount: val }));
    
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      autoSaveToDB({ amount: val }, targetId);
    }, 1000);
  };

  const handleFromAccountChange = (accountId, val) => {
    const targetId = accountId || focusedAccountId;
    if (!targetId) {
      setFormData(prev => ({ ...prev, fromAccount: val }));
      return;
    }

    setFromAccountsBySource(prev => ({ ...prev, [targetId]: val }));
    if (targetId === focusedAccountId) setFormData(prev => ({ ...prev, fromAccount: val }));

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      autoSaveToDB({ fromAccount: val }, targetId);
    }, 1000);
  };

  const handleToAccountChange = (accountId, val) => {
    const targetId = accountId || focusedAccountId;
    if (!targetId) {
      setFormData(prev => ({ ...prev, toAccount: val }));
      return;
    }

    setToAccountsBySource(prev => ({ ...prev, [targetId]: val }));
    if (targetId === focusedAccountId) setFormData(prev => ({ ...prev, toAccount: val }));

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      autoSaveToDB({ toAccount: val }, targetId);
    }, 1000);
  };

  const handleReceiptDelayChange = (accountId, val) => {
    const targetId = accountId || focusedAccountId;
    if (!targetId) {
      setFormData(prev => ({ ...prev, receiptDelayRange: val }));
      return;
    }
    setReceiptDelaysBySource(prev => ({ ...prev, [targetId]: val }));
    if (targetId === focusedAccountId) setFormData(prev => ({ ...prev, receiptDelayRange: val }));
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      autoSaveToDB({ receiptDelayRange: val }, targetId);
    }, 1000);
  };

  const handleBookingDelayChange = (accountId, val) => {
    const targetId = accountId || focusedAccountId;
    if (!targetId) {
      setFormData(prev => ({ ...prev, bookingDelayRange: val }));
      return;
    }
    setBookingDelaysBySource(prev => ({ ...prev, [targetId]: val }));
    if (targetId === focusedAccountId) setFormData(prev => ({ ...prev, bookingDelayRange: val }));
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      autoSaveToDB({ bookingDelayRange: val }, targetId);
    }, 1000);
  };

  const loadAccountConfig = async (accountId) => {
    try {
      const { data } = await configService.getAccountConfig(accountId);
      if (data) {
        const { targets, defaults } = data;
        
        // Auto-populate targets
        if (targets && targets.length > 0) {
          setTargetsBySource(prev => ({
            ...prev,
            [accountId]: new Set(targets)
          }));
          // Collapse by default if loaded with targets
          setCollapsedAccounts(prev => new Set([...prev, accountId]));
        }

        // Auto-populate amount for this specific account
        if (defaults && defaults.amount) {
          setAmountsBySource(prev => ({ ...prev, [accountId]: defaults.amount }));
        }

        // Auto-populate fromAccount for this specific account
        if (defaults && defaults.fromAccount) {
          setFromAccountsBySource(prev => ({ ...prev, [accountId]: defaults.fromAccount }));
        }

        // Auto-populate date and time for this specific account
        if (defaults && defaults.date) {
          setDatesBySource(prev => ({ ...prev, [accountId]: defaults.date }));
        }
        if (defaults && defaults.time) {
          setTimesBySource(prev => ({ ...prev, [accountId]: defaults.time }));
        }
        if (defaults && defaults.toAccount) {
          setToAccountsBySource(prev => ({ ...prev, [accountId]: defaults.toAccount }));
        }
        if (defaults && defaults.receiptDelayRange) {
          setReceiptDelaysBySource(prev => ({ ...prev, [accountId]: defaults.receiptDelayRange }));
        }
        if (defaults && defaults.bookingDelayRange) {
          setBookingDelaysBySource(prev => ({ ...prev, [accountId]: defaults.bookingDelayRange }));
        }

        // Only auto-populate defaults if this is the only selected account
        // or if the form is currently at its initial state.
        if (defaults && Object.keys(defaults).length > 0) {
          if (selectedSourceAccounts.size <= 1) {
             setFormData(prev => ({
               ...prev,
               ...defaults
             }));
          }
        }
      }
    } catch (err) {
      console.error('Failed to load account config', err);
    }
  };

  const saveCurrentConfigs = async (silent = true) => {
    try {
      const promises = Array.from(selectedSourceAccounts).map(accountId => {
        const targets = targetsBySource[accountId] ? Array.from(targetsBySource[accountId]) : [];
        const defaults = getAccountDefaults(accountId);
        return configService.saveAccountConfig(accountId, targets, defaults);
      });
      await Promise.all(promises);
      if (!silent) {
        toast.success('Settings and timers saved for selected accounts');
        setCollapsedAccounts(new Set(selectedSourceAccounts));
      }
    } catch (err) {
      console.error('Failed to save account configs', err);
      if (!silent) toast.error('Failed to save settings');
    }
  };

  // Toggle target for a specific source account
  const toggleTarget = (accountId, groupId) => {
    setTargetsBySource(prev => {
      const next = { ...prev };
      const accountSet = next[accountId] ? new Set(next[accountId]) : new Set();

      if (accountSet.has(groupId)) {
        accountSet.delete(groupId);
        if (accountSet.size === 0) {
          delete next[accountId];
        } else {
          next[accountId] = accountSet;
        }
      } else {
        accountSet.add(groupId);
        next[accountId] = accountSet;
      }
      return next;
    });
  };

  // Deselect all targets for a source account
  const deselectAllForAccount = (accountId) => {
    setTargetsBySource(prev => {
      const next = { ...prev };
      delete next[accountId];
      return next;
    });
  };

  // Reset all targets for all accounts
  const resetAllTargets = () => {
    setTargetsBySource({});
    toast.success('All targets cleared');
  };

  // Sync targets from one account to all other selected accounts
  const syncTargetsToAll = (sourceAccountId) => {
    const sourceTargets = targetsBySource[sourceAccountId];
    if (!sourceTargets || sourceTargets.size === 0) {
      toast.error('No targets selected for the source account.');
      return;
    }

    let missing = 0;
    const mappedByAccount = {};
    selectedSourceAccounts.forEach(accId => {
      if (accId === sourceAccountId) return;
      const mapped = remapTargetIdsForAccount(groups, Array.from(sourceTargets), accId);
      mappedByAccount[accId] = mapped.targetIds;
      missing += mapped.missing;
    });

    setTargetsBySource(prev => {
      const next = { ...prev };
      Object.entries(mappedByAccount).forEach(([accId, targetIds]) => {
        next[accId] = new Set(targetIds);
      });
      return next;
    });
    if (missing > 0) {
      toast.warning?.(`${missing} target${missing === 1 ? '' : 's'} skipped because the matching chat is not synced for that account`);
    }
    toast.success(`Targets synced across all ${selectedSourceAccounts.size} accounts!`);
  };

  // Get total selected targets ONLY for accounts that are currently selected as sources
  const getTotalSelectedTargets = () => {
    return Array.from(selectedSourceAccounts).reduce((total, accountId) => {
      const set = targetsBySource[accountId];
      return total + (set ? set.size : 0);
    }, 0);
  };

  const buildAccountDeliveryPlan = (accountId, hasBooking = true, baseMs = Date.now()) => {
    const schedulePlan = buildSchedulePlan({
      receiptDelayRange: receiptDelaysBySource[accountId] || formData.receiptDelayRange,
      bookingDelayRange: bookingDelaysBySource[accountId] || formData.bookingDelayRange,
      hasBooking,
    });

    return {
      schedulePlan,
      deliveryDateTime: getBhutanDateTimeAfterSeconds(schedulePlan.receiptDelaySeconds, baseMs),
    };
  };

  const buildBroadcastTimingPlan = (targets, baseMs = Date.now()) => ({
    baseMs,
    accounts: targets.reduce((plans, target) => ({
      ...plans,
      [target.accountId]: buildAccountDeliveryPlan(target.accountId, true, baseMs),
    }), {}),
  });

  const getPlannedDelivery = (accountId, timingPlan, hasBooking = true, baseMs = Date.now()) => (
    timingPlan?.accounts?.[accountId] || buildAccountDeliveryPlan(accountId, hasBooking, baseMs)
  );

  // Receipt details based on documentation
  const [formData, setFormData] = useState({
    amount: '5,000.00',
    journalNo: '78464649',
    fromAccount: '941234444',
    toAccount: '491234644',
    purpose: 'Go',
    date: '13 May 2026',
    time: '02:49:27 PM',
    bookingNo: '',
    message: '',
    receiptDelayRange: '10-30',
    bookingDelayRange: '10-20'
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    handleFieldChange(name, value);
  };

  const generateJournalNo = () => {
    const randomLen = Math.floor(Math.random() * 6) + 7; // 7 to 12
    const val = randomDigits(randomLen);
    handleFieldChange('journalNo', val);
  };

  const generateBookingNo = () => {
    const val = buildRandomBookingNo();
    handleFieldChange('bookingNo', val);
  };

  const generatePurpose = () => {
    const val = buildRandomPurpose();
    handleFieldChange('purpose', val);
  };

  const handleDateChange = (accountId, val) => {
    const targetId = accountId || focusedAccountId;
    if (!targetId) {
      setFormData(prev => ({ ...prev, date: val }));
      return;
    }

    setDatesBySource(prev => ({ ...prev, [targetId]: val }));
    if (targetId === focusedAccountId) setFormData(prev => ({ ...prev, date: val }));

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      autoSaveToDB({ date: val }, targetId);
    }, 1000);
  };

  const handleTimeChange = (accountId, val) => {
    const targetId = accountId || focusedAccountId;
    if (!targetId) {
      setFormData(prev => ({ ...prev, time: val }));
      return;
    }

    setTimesBySource(prev => ({ ...prev, [targetId]: val }));
    if (targetId === focusedAccountId) setFormData(prev => ({ ...prev, time: val }));

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      autoSaveToDB({ time: val }, targetId);
    }, 1000);
  };

  const setCurrentTime = (accountId = focusedAccountId) => {
    const { date, time } = getBhutanDateTime();
    if (accountId) {
      setDatesBySource(prev => ({ ...prev, [accountId]: date }));
      setTimesBySource(prev => ({ ...prev, [accountId]: time }));
      autoSaveToDB({ date, time }, accountId);
    }
    if (!accountId || accountId === focusedAccountId) {
      setFormData(prev => ({ ...prev, date, time }));
    }
  };

  const handlePreview = async () => {
    if (selectedSourceAccounts.size === 0) {
       toast.error('Please select at least one account to preview');
       return;
    }
    
    setPreviewing(true);
    try {
      const selectedIds = Array.from(selectedSourceAccounts);
      const newPreviews = [];
      const previewBaseMs = Date.now();
      
      for (let i = 0; i < selectedIds.length; i++) {
        const accId = selectedIds[i];
        const res = getRandomResolution();
        const account = accounts.find(a => String(a.id) === String(accId));
        const { deliveryDateTime } = buildAccountDeliveryPlan(accId, true, previewBaseMs);

        const receiptPayload = {
          ...formatReceiptPayload(formData),
          amount: amountsBySource[accId] || formData.amount,
          fromAccount: fromAccountsBySource[accId] || account?.bank_account_number || formData.fromAccount,
          toAccount: toAccountsBySource[accId] || formData.toAccount,
          date: deliveryDateTime.date,
          time: deliveryDateTime.time
        };
        
        const { data } = await templateService.preview({
          variables: receiptPayload,
          width: res.width,
          height: res.height
        });
        
        newPreviews.push({
          accountId: accId,
          url: data.preview,
          resolution: res,
          accountName: account ? getAccountDisplay(account) : 'Unknown'
        });
      }
      
      setPreviews(newPreviews);
      setActivePreviewIndex(0);
      
      if (window.innerWidth < 1024) {
        setTimeout(() => {
          const el = document.getElementById('receipt-preview');
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 150);
      }
    } catch (err) {
      console.error('Preview failed', err);
      toast.error('Failed to generate previews');
    } finally {
      setPreviewing(false);
    }
  };

  const handleGenerate = async () => {
    // If source accounts and targets are selected, use handleBroadcast
    if (selectedSourceAccounts.size > 0 && getTotalSelectedTargets() > 0 || manualTargets.trim()) {
      await handleBroadcast();
      return;
    }

    setLoading(true);
    try {
      // Auto-randomize purpose and booking no for every new receipt
      generatePurpose();
      generateBookingNo();
      
      const res = getRandomResolution();

      // Use the prefix to build a full journal no for preview
      const previewJournalNo = buildJournalNo(formData.journalNo);
      const { deliveryDateTime } = buildAccountDeliveryPlan(focusedAccountId, true, Date.now());
      
      const receiptPayload = {
        ...formatReceiptPayload(formData),
        journalNo: previewJournalNo,
        date: deliveryDateTime.date,
        time: deliveryDateTime.time,
        ...getRandomFrame()
      };

      const { data } = await templateService.generate({
        variables: receiptPayload,
        width: res.width,
        height: res.height,
        randomize: false
      });
      const fullUrl = data.url.startsWith('http') ? data.url : `${data.url}`;
      setPreviews([{ url: fullUrl, resolution: res, accountName: 'Default' }]);
      setActivePreviewIndex(0);
      
      // Auto-save configs when generating
      await saveCurrentConfigs();
      
      toast.success('Receipt generated! Now select source accounts and targets to share.');
    } catch {
      toast.error('Failed to generate receipt');
    } finally {
      setLoading(false);
    }
  };

  const getBroadcastTargets = () => {
    const targets = [];

    // Add targets from selected source accounts
    for (const accountId of selectedSourceAccounts) {
      const groupSet = targetsBySource[accountId];
      if (groupSet && groupSet.size > 0) {
        targets.push({
          accountId: accountId,
          groupIds: Array.from(groupSet)
        });
      }
    }

    // Add manual targets to the first selected account
    if (manualTargets.trim()) {
      const manualList = manualTargets.split(',').map(t => t.trim()).filter(Boolean);
      if (manualList.length > 0) {
        if (selectedSourceAccounts.size > 0) {
          const firstAcc = Array.from(selectedSourceAccounts)[0];
          const targetIdx = targets.findIndex(t => t.accountId === firstAcc);
          if (targetIdx >= 0) {
            targets[targetIdx].groupIds.push(...manualList);
          } else {
            targets.push({ accountId: firstAcc, groupIds: manualList });
          }
        } else if (accounts.length > 0) {
          targets.push({ accountId: accounts[0].id, groupIds: manualList });
        }
      }
    }
    return targets;
  };

  const handleBroadcast = async (confirmed = false) => {
    const targets = getBroadcastTargets();
    if (targets.length === 0) {
      toast.error('Please select at least one source account and target.');
      return;
    }

    if (!confirmed) {
      setLoading(true);
      try {
        const selectedIds = targets.map(target => target.accountId);
        const newPreviews = [];
        const timingPlan = buildBroadcastTimingPlan(targets, Date.now());
        
        // In review mode, we generate full screenshots (not just previews)
        // but for performance we might just generate the first 2-3 if many are selected
        const reviewLimit = Math.min(selectedIds.length, 5); 
        
        for (let i = 0; i < reviewLimit; i++) {
          const accId = selectedIds[i];
          const res = getRandomResolution();
          const account = accounts.find(a => String(a.id) === String(accId));
          const sampleJournalNo = buildJournalNo(formData.journalNo);
          const { deliveryDateTime } = getPlannedDelivery(accId, timingPlan);

          const receiptPayload = {
            ...formatReceiptPayload(formData),
            amount: amountsBySource[accId] || formData.amount,
            journalNo: sampleJournalNo,
            fromAccount: fromAccountsBySource[accId] || account?.bank_account_number || formData.fromAccount,
            toAccount: toAccountsBySource[accId] || formData.toAccount,
            date: deliveryDateTime.date,
            time: deliveryDateTime.time,
            ...getRandomFrame()
          };

          const { data } = await templateService.generate({
            variables: receiptPayload,
            width: res.width,
            height: res.height,
            randomize: false
          });
          
          newPreviews.push({
            accountId: accId,
            url: data.url.startsWith('http') ? data.url : `${data.url}`,
            resolution: res,
            accountName: account ? getAccountDisplay(account) : 'Unknown'
          });
        }
        
        setPreviews(newPreviews);
        setActivePreviewIndex(0);
        setShowReview(true);
      } catch (err) {
        console.error('Review generation failed', err);
        toast.error('Failed to generate review samples');
      } finally {
        setLoading(false);
      }
      return;
    }

    setShowReview(false);
    setBroadcasting(true);
    setSendingState({ active: true, status: 'Scheduling Telegram account flows...', jobs: {} });

    try {
      const sendClickedAtMs = Date.now();
      await saveCurrentConfigs();
      const timingPlan = buildBroadcastTimingPlan(targets, sendClickedAtMs);

      const initialJobsState = {};
      targets.forEach(t => {
        const account = accounts.find(a => String(a.id) === String(t.accountId));
        initialJobsState[t.accountId] = { 
          status: 'ready', 
          accountName: account ? getAccountDisplay(account) : t.accountId 
        };
      });
      setSendingState(prev => ({ ...prev, jobs: initialJobsState }));

      const broadcastPromises = targets.map(async (target) => {
        const { accountId, groupIds } = target;
        const account = accounts.find(a => String(a.id) === String(accountId));
        const accountName = getAccountDisplay(account || { id: accountId });

        const updateJob = (updates) => {
          setSendingState(prev => ({
            ...prev,
            jobs: { ...prev.jobs, [accountId]: { ...prev.jobs[accountId], ...updates } }
          }));
        };

        try {
          updateJob({ status: 'generating' });
          const uniqueJournalNo = buildJournalNo(formData.journalNo);
          const uniquePurpose = buildRandomPurpose();
          const uniqueBookingNo = buildRandomBookingNo();
          const { schedulePlan, deliveryDateTime } = getPlannedDelivery(accountId, timingPlan, Boolean(uniqueBookingNo));
          const resolution = getRandomResolution();

          const receiptPayload = {
            ...formatReceiptPayload(formData),
            amount: amountsBySource[accountId] || formData.amount,
            journalNo: uniqueJournalNo,
            purpose: uniquePurpose,
            bookingNo: uniqueBookingNo,
            fromAccount: fromAccountsBySource[accountId] || account?.bank_account_number || formData.fromAccount,
            toAccount: toAccountsBySource[accountId] || formData.toAccount,
            date: deliveryDateTime.date,
            time: deliveryDateTime.time,
            ...getRandomFrame()
          };

          const { data } = await templateService.generate({
            variables: receiptPayload,
            width: resolution.width,
            height: resolution.height,
            randomize: false
          });

          updateJob({
            status: schedulePlan.status,
            statusLabel: schedulePlan.activeLabel,
            delay: schedulePlan.displayDelaySeconds,
            receiptDelay: schedulePlan.receiptDelaySeconds,
            bookingDelay: schedulePlan.bookingDelaySeconds,
            deliveryTime: deliveryDateTime.time,
            deliveryDate: deliveryDateTime.date,
          });
          const broadcastResponse = await telegramService.broadcast({
            targets: [{ accountId, groupIds }],
            mediaPath: data.path,
            caption: formData.message || '',
            receiptDelaySeconds: schedulePlan.receiptDelaySeconds,
            followUpText: uniqueBookingNo || undefined,
            bookingDelaySeconds: schedulePlan.bookingDelaySeconds,
            receiptDeliveryDate: deliveryDateTime.date,
            receiptDeliveryTime: deliveryDateTime.time,
            sendClickedAt: new Date(sendClickedAtMs).toISOString(),
          });
          assertBroadcastSucceeded(broadcastResponse);
          
          updateJob({
            status: schedulePlan.receiptDelaySeconds > 0 ? 'scheduled' : 'sent',
            statusLabel: schedulePlan.doneLabel,
            delay: schedulePlan.displayDelaySeconds,
          });
          return accountName;
        } catch (err) {
          updateJob({ status: 'failed', error: err.message });
          throw err;
        }
      });

      setSendingState(prev => ({ ...prev, status: `Scheduling ${targets.length} Telegram account flows...` }));
      await Promise.all(broadcastPromises);
      toast.success('Telegram account flows scheduled successfully!');
    } catch (err) {
      console.error('Broadcast failed:', err);
      toast.error('One or more broadcast jobs failed.');
    } finally {
      setBroadcasting(false);
      setSendingState(prev => ({ ...prev, active: false }));
    }
  };

  // Filter groups for a specific account
  const getFilteredGroups = (accountId) => {
    const search = targetSearch[accountId] || '';
    const accountGroups = groups.filter(g => String(g.account_id) === String(accountId));
    if (!search) return accountGroups;
    return accountGroups.filter(g =>
      g.title?.toLowerCase().includes(search.toLowerCase()) ||
      g.username?.toLowerCase().includes(search.toLowerCase())
    );
  };

  // Get selected target count for account
  const getSelectedCount = (accountId) => {
    return targetsBySource[accountId]?.size || 0;
  };

  const getEditorValue = (map, accountId, fallback) => (
    accountId && hasAccountOverride(map, accountId) ? map[accountId] : fallback
  );

  const selectedAccountIds = Array.from(selectedSourceAccounts);
  const receiptEditorAccountIds = selectedAccountIds.length > 0
    ? (isMultiSelect ? selectedAccountIds : [focusedAccountId || selectedAccountIds[0]])
    : [null];

  const renderReceiptDetailsEditor = (accountId, index) => {
    const account = accountId ? getAccountById(accountId) : null;
    const accountName = account ? getAccountDisplay(account) : 'Default receipt';
    const amountValue = getEditorValue(amountsBySource, accountId, formData.amount);
    const fromAccountValue = getEditorValue(
      fromAccountsBySource,
      accountId,
      account?.bank_account_number || formData.fromAccount
    );
    const toAccountValue = getEditorValue(toAccountsBySource, accountId, formData.toAccount);
    const dateValue = getEditorValue(datesBySource, accountId, formData.date);
    const timeValue = getEditorValue(timesBySource, accountId, formData.time);
    const receiptDelayValue = getEditorValue(receiptDelaysBySource, accountId, formData.receiptDelayRange);
    const bookingDelayValue = getEditorValue(bookingDelaysBySource, accountId, formData.bookingDelayRange);
    const selectedCount = accountId ? getSelectedCount(accountId) : 0;

    return (
      <div
        key={accountId || 'default-receipt-editor'}
        className="rounded-2xl border border-slate-800/70 bg-slate-950/25 p-3 sm:p-4 space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-300 border border-blue-500/20 flex items-center justify-center text-[10px] font-black shrink-0">
                {accountId ? index + 1 : 'D'}
              </span>
              <p className="text-sm font-bold text-slate-100 truncate">{accountName}</p>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              {accountId ? `${account?.bank_account_number || 'No profile no.'} - ${selectedCount} targets` : 'Used when no account is selected'}
            </p>
          </div>
          {accountId && (
            <button
              type="button"
              onClick={() => setFocusedAccountId(accountId)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                focusedAccountId === accountId
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  : 'text-slate-500 hover:text-blue-300 hover:bg-slate-800'
              }`}
            >
              Editing
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Receipt Time Offset</label>
              <span className="text-[9px] text-emerald-500 font-bold uppercase tracking-widest">This Account</span>
            </div>
            <select
              name={`receiptDelayRange-${accountId || 'default'}`}
              value={receiptDelayValue}
              onChange={(e) => handleReceiptDelayChange(accountId, e.target.value)}
              className={`w-full bg-slate-950 border rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition-colors ${
                accountId && hasAccountOverride(receiptDelaysBySource, accountId) ? 'border-blue-500/50' : 'border-slate-800'
              }`}
            >
              {receiptScheduleOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Booking Message Offset</label>
              <span className="text-[9px] text-emerald-500 font-bold uppercase tracking-widest">This Account</span>
            </div>
            <select
              name={`bookingDelayRange-${accountId || 'default'}`}
              value={bookingDelayValue}
              onChange={(e) => handleBookingDelayChange(accountId, e.target.value)}
              className={`w-full bg-slate-950 border rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition-colors ${
                accountId && hasAccountOverride(bookingDelaysBySource, accountId) ? 'border-blue-500/50' : 'border-slate-800'
              }`}
            >
              {bookingDelayOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Amount"
            name={`amount-${accountId || 'default'}`}
            value={amountValue}
            onChange={(e) => handleAmountChange(accountId, e.target.value)}
            placeholder="5,000.00"
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-500 font-bold uppercase tracking-tighter">Journal No. Preview</label>
            <Input
              name={`journalNoPreview-${accountId || 'default'}`}
              value={formData.journalNo ? buildJournalNo(formData.journalNo) : '---'}
              disabled
              className="flex-1 bg-slate-900/50 border-slate-800/50 text-slate-500 cursor-not-allowed font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs text-slate-500 font-bold uppercase tracking-tighter">From Account</label>
              <span className="text-[9px] text-emerald-500 font-bold uppercase tracking-widest">Auto-Linked</span>
            </div>
            <Input
              name={`fromAccount-${accountId || 'default'}`}
              value={fromAccountValue}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 12);
                handleFromAccountChange(accountId, val);
              }}
              placeholder="Profile number"
              className={fromAccountValue ? 'border-blue-500/50' : 'border-slate-800/50 opacity-60'}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs text-slate-500 font-bold uppercase tracking-tighter">To Account</label>
              <span className="text-[9px] text-emerald-500 font-bold uppercase tracking-widest">This Account</span>
            </div>
            <Input
              name={`toAccount-${accountId || 'default'}`}
              value={toAccountValue}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 9);
                handleToAccountChange(accountId, val);
              }}
              placeholder="9 digits"
              className={accountId && hasAccountOverride(toAccountsBySource, accountId) ? 'border-blue-500/50' : 'border-slate-800/50'}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-500 font-bold uppercase tracking-tighter">Date</label>
            <div className="flex gap-2">
              <Input
                name={`date-${accountId || 'default'}`}
                value={dateValue}
                onChange={(e) => handleDateChange(accountId, e.target.value)}
                className="flex-1"
              />
              <Button variant="ghost" size="sm" onClick={() => setCurrentTime(accountId)} className="bg-slate-800/50"><Clock size={14} /></Button>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-500 font-bold uppercase tracking-tighter">Time</label>
            <div className="flex gap-2">
              <Input
                name={`time-${accountId || 'default'}`}
                value={timeValue}
                onChange={(e) => handleTimeChange(accountId, e.target.value)}
                className="flex-1"
              />
              <Button variant="ghost" size="sm" onClick={() => setCurrentTime(accountId)} className="bg-slate-800/50"><RotateCcw size={14} /></Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4 sm:gap-6 pb-36 sm:pb-12 animate-fade-in max-w-[1600px] mx-auto relative">
      {/* Header & Global Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="px-1">
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Receipt Broadcast</h2>
          <p className="text-slate-400 text-xs sm:text-sm mt-0.5 sm:mt-1">Professional multi-account receipt management.</p>
        </div>
        
        <div className="flex items-center gap-4">
           {sendingState.active && (
             <div className="flex items-center gap-2 sm:gap-3 bg-emerald-500/10 border border-emerald-500/20 px-3 sm:px-4 py-1.5 sm:py-2 rounded-2xl shadow-[0_0_15px_rgba(16,185,129,0.1)]">
               <Timer size={16} className="text-emerald-400 animate-pulse" />
               <span className="text-emerald-400 text-[11px] sm:text-sm font-semibold">{sendingState.status}</span>
               <button onClick={cancelSending} className="ml-1 sm:ml-2 p-1 hover:bg-emerald-500/20 rounded-lg text-emerald-400 transition-colors">
                 <Square size={12} fill="currentColor" />
               </button>
             </div>
           )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
        {/* LEFT COLUMN: Account & Target Management (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {/* Step 1: Account Selection */}
          <Card className="border-slate-800/50 bg-slate-900/20 backdrop-blur-sm">
            <Card.Header className="border-b border-slate-800/50 flex flex-col sm:flex-row sm:justify-between gap-4 py-4">
              <div className="flex items-center justify-between w-full sm:w-auto">
                <div className="flex items-center gap-2">
                  <Users size={18} className="text-blue-400 shrink-0" />
                  <span className="text-base sm:text-lg text-slate-200 font-bold truncate">1. Select Source Accounts</span>
                </div>
                <Badge color="blue" className="ml-2 sm:ml-4">{selectedSourceAccounts.size}</Badge>
              </div>
              <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4">
                <div className="flex items-center gap-1 sm:gap-2 bg-slate-950/50 border border-slate-800/50 rounded-xl p-1">
                   <button 
                     onClick={() => {
                       setIsMultiSelect(false);
                       if (selectedSourceAccounts.size > 1) {
                         const first = Array.from(selectedSourceAccounts)[0];
                         setSelectedSourceAccounts(new Set([first]));
                         setFocusedAccountId(first);
                       }
                     }}
                     className={`px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-tighter transition-all ${!isMultiSelect ? 'bg-blue-500 text-white' : 'text-slate-500'}`}
                   >
                     Single
                   </button>
                   <button 
                     onClick={() => setIsMultiSelect(true)}
                     className={`px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-tighter transition-all ${isMultiSelect ? 'bg-blue-500 text-white' : 'text-slate-500'}`}
                   >
                     Multi
                   </button>
                </div>
                <Button variant="ghost" size="xs" onClick={() => handleSync()} className="text-slate-500 hover:text-blue-400">
                  <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
                </Button>
              </div>
            </Card.Header>
            <Card.Body className="p-4">
              {accounts.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-slate-500 text-sm mb-4">No accounts connected yet.</p>
                  <Button variant="primary" size="sm" onClick={() => navigate('/accounts')}>Connect First Account</Button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 sm:gap-3">
                  {accounts.map(acc => {
                    const isSelected = selectedSourceAccounts.has(acc.id);
                    const isFocused = focusedAccountId === acc.id;
                    const targetCount = getSelectedCount(acc.id);
                    return (
                      <button
                        key={acc.id}
                        onClick={() => toggleSourceAccount(acc.id)}
                        className={`group relative flex items-center gap-3 pl-3 pr-4 py-2.5 rounded-2xl border transition-all ${
                          isFocused
                            ? 'bg-blue-600/20 border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.15)] ring-1 ring-blue-400/30'
                            : isSelected
                              ? 'bg-blue-600/10 border-blue-500/50 shadow-lg shadow-blue-500/5'
                              : 'bg-slate-800/30 border-slate-700/50 hover:border-slate-600 text-slate-400'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                          isFocused ? 'bg-blue-500 text-white shadow-lg' : isSelected ? 'bg-blue-500/50 text-white' : 'bg-slate-800 text-slate-500 group-hover:bg-slate-700'
                        }`}>
                          <User size={16} />
                        </div>
                        <div className="text-left">
                          <p className={`text-xs font-bold truncate max-w-[100px] ${isFocused ? 'text-blue-200' : isSelected ? 'text-blue-400' : 'text-slate-300'}`}>
                            {getAccountDisplay(acc)}
                          </p>
                          <p className="text-[9px] text-slate-500 flex items-center gap-1">
                            {acc.bank_account_number || 'No Profile No.'} 
                            <span className="w-1 h-1 bg-slate-700 rounded-full" />
                            {targetCount} targets
                          </p>
                        </div>
                        {isFocused && (
                           <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-blue-500 text-[9px] font-black text-white rounded-md uppercase tracking-tighter shadow-md z-10">Editing</div>
                        )}
                        {isSelected && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-950 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </Card.Body>
          </Card>

          {/* Step 2: Target Management */}
          {selectedSourceAccounts.size > 0 && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between px-1 gap-4">
                <div className="flex items-center justify-between w-full sm:w-auto">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
                    <span className="text-base sm:text-lg text-slate-200 font-bold truncate">2. Distribution Summary</span>
                  </div>
                  <Badge color="emerald" className="ml-2 sm:ml-4">{getTotalSelectedTargets()} Total Targets</Badge>
                </div>
                <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-3">
                  <Button 
                    variant="ghost" 
                    size="xs" 
                    icon={RotateCcw} 
                    onClick={resetAllTargets}
                    className="text-red-400 hover:bg-red-400/10 text-[10px] sm:text-xs"
                  >
                    Reset All
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="xs" 
                    icon={RefreshCw} 
                    onClick={() => saveCurrentConfigs(false)}
                    className="text-slate-400 hover:text-blue-400 text-[10px] sm:text-xs"
                  >
                    Auto-Save Active
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                {/* Master Action: If multiple accounts, offer to sync them */}
                {selectedSourceAccounts.size > 1 && (
                   <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge color="blue">Tip</Badge>
                        <p className="text-[11px] text-blue-300">Select targets for one account, then click "Sync" to apply to all.</p>
                      </div>
                      <Button variant="ghost" size="xs" onClick={() => syncTargetsToAll(Array.from(selectedSourceAccounts)[0])} className="text-blue-400 hover:bg-blue-400/20">
                         Apply First to All
                      </Button>
                   </div>
                )}
                {Array.from(selectedSourceAccounts).map(accountId => {
                  const account = accounts.find(a => a.id === accountId);
                  if (!account) return null;
                  const accountGroups = getFilteredGroups(accountId);
                  const selectedCount = getSelectedCount(accountId);
                  const isCollapsed = collapsedAccounts.has(accountId);

                  return (
                    <div key={accountId} className="group border border-slate-800/60 rounded-2xl bg-slate-900/40 overflow-hidden transition-all hover:border-slate-700">
                      <div className="flex items-start sm:items-center justify-between p-3 bg-slate-800/10 gap-2">
                        <div className="flex items-start sm:items-center gap-3 min-w-0">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${selectedCount > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                            <Users size={16} />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-slate-200 truncate">{getAccountDisplay(account)}</p>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500 font-mono shrink-0">{account.bank_account_number || '---'}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mt-0.5">
                              <p className="text-[10px] text-slate-500 whitespace-nowrap">{selectedCount} destinations</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleSync(accountId)}
                            title="Sync Telegram groups for this account"
                            className="hidden sm:flex text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-emerald-400 px-2 py-1 rounded-lg hover:bg-slate-800 transition-all items-center gap-1.5"
                          >
                            <RefreshCw size={10} />
                            Refresh
                          </button>
                          <button
                            onClick={() => syncTargetsToAll(accountId)}
                            title="Apply these targets to all other selected accounts"
                            className="hidden sm:flex text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-blue-400 px-2 py-1 rounded-lg hover:bg-slate-800 transition-all items-center gap-1.5"
                          >
                            <RefreshCw size={10} />
                            Apply Targets
                          </button>
                          <button
                            onClick={() => deselectAllForAccount(accountId)}
                            className="text-[10px] font-bold uppercase tracking-wider text-red-400/70 hover:text-red-400 px-2 py-1 rounded-lg hover:bg-red-400/10 transition-all"
                          >
                            Clear
                          </button>
                          <button
                            onClick={() => toggleAccountCollapse(accountId)}
                            className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-500 transition-all"
                          >
                            {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                          </button>
                        </div>
                      </div>

                      {!isCollapsed && (
                        <div className="p-4 pt-0">
                          <div className="relative my-3">
                            <Input
                              placeholder="Search groups or users..."
                              value={targetSearch[accountId] || ''}
                              onChange={(e) => setTargetSearch(prev => ({ ...prev, [accountId]: e.target.value }))}
                              className="pl-9 py-2 text-xs bg-slate-950/50 border-slate-800"
                            />
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                            </div>
                          </div>

                          {accountGroups.length === 0 ? (
                            <div className="py-8 text-center border border-dashed border-slate-800 rounded-xl">
                              <p className="text-xs text-slate-600">No matching targets found.</p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                              {accountGroups.map(g => {
                                const isSelected = targetsBySource[accountId]?.has(g.id);
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
                                      <p className="text-xs font-medium truncate">{g.title}</p>
                                      <p className="text-[9px] text-slate-600 uppercase font-bold tracking-tighter">{g.type}</p>
                                    </div>
                                    <input type="checkbox" className="hidden" checked={!!isSelected} onChange={() => toggleTarget(accountId, g.id)} />
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Manual Targets */}
                <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-4">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Manual Destinations</p>
                  <Input
                    placeholder="Enter usernames or IDs separated by commas (e.g. @user1, 12345)"
                    value={manualTargets}
                    onChange={(e) => setManualTargets(e.target.value)}
                    className="bg-slate-950/50 border-slate-800 text-sm"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Receipt Config & Preview (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6 sticky top-6">
          
          {/* Step 3: Global Journal Prefix */}
          <Card className="border-slate-800/50 bg-slate-900/20 backdrop-blur-sm">
            <Card.Body className="p-4 flex flex-col sm:flex-row items-center gap-4">
              <div className="flex items-center gap-2 min-w-max">
                <Badge color="blue">3</Badge>
                <span className="text-slate-200 font-bold text-xs uppercase tracking-widest">Journal Prefix</span>
              </div>
              <div className="flex-1 w-full flex items-center gap-2">
                <div className="relative flex-1">
                  <Input 
                    placeholder="Prefix (auto-padded to 12 digits)" 
                    name="journalNo" 
                    value={formData.journalNo} 
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 12);
                      setFormData(prev => ({ ...prev, journalNo: val }));
                    }}
                    maxLength={12}
                    className="bg-slate-950 h-11 pr-10 font-mono border-slate-800 text-blue-400"
                  />
                  <button 
                    onClick={generateJournalNo}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-blue-400 transition-colors"
                  >
                    <RotateCcw size={14} />
                  </button>
                </div>
                <Button 
                  variant="primary" 
                  size="sm" 
                  onClick={saveGlobalJournalNo}
                  disabled={loading}
                  className="h-11 px-4 rounded-xl shadow-lg shadow-blue-500/10"
                >
                  Save
                </Button>
              </div>
            </Card.Body>
          </Card>

          {/* Step 4: Receipt Details */}
          <Card className="border-slate-800/50 bg-slate-900/20 backdrop-blur-sm">
            <Card.Header className="border-b border-slate-800/50 py-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Badge color="blue">4</Badge>
                <span className="text-slate-200 font-bold">Receipt Details</span>
              </div>
              {isSaving && (
                <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <div className="w-1 h-1 bg-emerald-400 rounded-full animate-ping" />
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Saving...</span>
                </div>
              )}
            </Card.Header>
            <Card.Body className="p-4 space-y-5">
              <div className="space-y-4">
                {receiptEditorAccountIds.map((accountId, index) => renderReceiptDetailsEditor(accountId, index))}
              </div>

              <div className="space-y-4 pt-2">
                <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-slate-950/30 border border-slate-800/50">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Purpose (Editable)</label>
                    <Button variant="ghost" size="xs" onClick={generatePurpose} className="text-blue-400 hover:bg-blue-400/10"><RotateCcw size={10} /></Button>
                  </div>
                  <input
                    name="purpose"
                    value={formData.purpose}
                    onChange={handleChange}
                    className="w-full bg-transparent border-none p-0 text-sm text-slate-200 font-medium italic focus:ring-0 focus:outline-none"
                    placeholder="Enter purpose..."
                  />
                </div>

                <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-slate-950/30 border border-slate-800/50">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Booking No. (Advanced Logic)</label>
                    <Button variant="ghost" size="xs" onClick={generateBookingNo} className="text-blue-400 hover:bg-blue-400/10"><RotateCcw size={10} /></Button>
                  </div>
                  <input
                    name="bookingNo"
                    value={formData.bookingNo}
                    onChange={handleChange}
                    className="w-full bg-transparent border-none p-0 text-sm font-mono text-emerald-400 tracking-widest focus:ring-0 focus:outline-none"
                    placeholder="Enter booking number..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-2">
                <Button variant="secondary" icon={Eye} onClick={handlePreview} loading={previewing} className="py-2.5 sm:py-3 text-xs sm:text-sm">Preview</Button>
                <Button 
                  icon={selectedSourceAccounts.size > 0 && getTotalSelectedTargets() > 0 ? Send : Play} 
                  onClick={handleGenerate} 
                  loading={loading} 
                  disabled={sendingState.active}
                  className="py-2.5 sm:py-3 text-xs sm:text-sm shadow-lg shadow-blue-500/20"
                >
                  {sendingState.active ? 'Wait...' : (selectedSourceAccounts.size > 0 && getTotalSelectedTargets() > 0 ? 'Review & Send' : 'Generate')}
                </Button>
              </div>
            </Card.Body>
          </Card>
 
          {/* Broadcasting Activity Section */}
          {sendingState.active && (
            <Card className="border-blue-500/30 bg-blue-500/5 backdrop-blur-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4">
              <Card.Header className="py-3 px-4 border-b border-blue-500/20 flex justify-between items-center bg-blue-500/10">
                <div className="flex items-center gap-2">
                  <RefreshCw size={14} className="text-blue-400 animate-spin" />
                  <span className="text-[11px] font-bold text-blue-300 uppercase tracking-widest">Broadcast Activity</span>
                </div>
                <Badge color="blue" className="text-[10px]">{Object.keys(sendingState.jobs || {}).length} Active Jobs</Badge>
              </Card.Header>
              <Card.Body className="p-0 max-h-[320px] overflow-y-auto custom-scrollbar">
                <div className="divide-y divide-blue-500/10">
                  {Object.entries(sendingState.jobs || {}).map(([accId, job]) => (
                    <div key={accId} className="p-3 flex items-center justify-between hover:bg-blue-500/5 transition-colors">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-bold text-slate-200">{job.accountName}</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold uppercase tracking-tighter ${
                            job.status === 'sent' || job.status === 'scheduled' ? 'text-emerald-400' : 
                            job.status === 'failed' ? 'text-red-400' : 
                            'text-blue-400'
                          }`}>
                            {job.statusLabel ||
                             (job.status === 'ready' ? 'Ready' :
                             job.status === 'generating' ? 'Generating receipt' :
                             job.status === 'sending' ? 'Sending now' :
                             job.status === 'scheduling' ? 'Scheduling in Telegram' :
                             job.status === 'scheduled' ? 'Scheduled in Telegram' :
                             job.status)}
                          </span>
                          {job.status !== 'sent' && job.status !== 'scheduled' && job.status !== 'failed' && (
                            <div className="w-12 h-1 bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-500 animate-pulse" style={{ width: '60%' }} />
                            </div>
                          )}
                        </div>
                      </div>
                      {job.status === 'sent' || job.status === 'scheduled' ? (
                        <div className="bg-emerald-500/20 p-1.5 rounded-full"><CheckCircle2 size={14} className="text-emerald-400" /></div>
                      ) : job.status === 'failed' ? (
                        <div className="bg-red-500/20 p-1.5 rounded-full"><XCircle size={14} className="text-red-400" /></div>
                      ) : (
                        <Clock size={14} className="text-slate-500 animate-pulse" />
                      )}
                    </div>
                  ))}
                </div>
              </Card.Body>
            </Card>
          )}

          {/* Real-time Preview Rendering */}
          <div id="receipt-preview" className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
            <div className="relative bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                <div className="flex items-center gap-2">
                  <ImageIcon size={16} className="text-emerald-400" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {previews.length > 1 ? `Preview ${activePreviewIndex + 1} of ${previews.length}` : 'Live Receipt Preview'}
                  </span>
                </div>
                {previews.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 font-medium">{previews[activePreviewIndex].accountName}</span>
                    <Badge color="green" className="text-[8px]">{previews[activePreviewIndex].resolution.width}x{previews[activePreviewIndex].resolution.height}</Badge>
                  </div>
                )}
              </div>
              
              <div className="bg-slate-950 relative flex flex-col items-center p-4 min-h-[300px]">
                {previews.length > 0 ? (
                  <>
                    <div className="w-full flex justify-center items-center gap-4">
                      {previews.length > 1 && (
                        <button 
                          onClick={() => setActivePreviewIndex(prev => (prev === 0 ? previews.length - 1 : prev - 1))}
                          className="absolute left-2 z-10 p-2 bg-slate-900/80 border border-slate-700 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-all shadow-xl"
                        >
                          <ChevronLeft size={20} />
                        </button>
                      )}
                      
                      <div className="w-full overflow-hidden flex justify-center">
                         <img 
                           key={previews[activePreviewIndex].url}
                           src={previews[activePreviewIndex].url} 
                           alt="Receipt Preview" 
                           className="w-full max-w-sm h-auto rounded-xl shadow-2xl transition-all duration-500 animate-in fade-in slide-in-from-right-4" 
                         />
                      </div>

                      {previews.length > 1 && (
                        <button 
                          onClick={() => setActivePreviewIndex(prev => (prev === previews.length - 1 ? 0 : prev + 1))}
                          className="absolute right-2 z-10 p-2 bg-slate-900/80 border border-slate-700 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-all shadow-xl"
                        >
                          <ChevronRight size={20} />
                        </button>
                      )}
                    </div>
                    
                    {previews.length > 1 && (
                      <div className="flex gap-1.5 mt-4">
                        {previews.map((_, idx) => (
                          <div 
                            key={idx} 
                            onClick={() => setActivePreviewIndex(idx)}
                            className={`h-1 rounded-full transition-all cursor-pointer ${idx === activePreviewIndex ? 'w-6 bg-blue-500' : 'w-2 bg-slate-800'}`} 
                          />
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-10 h-full">
                    <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                      <ImageIcon size={24} className="text-slate-600" />
                    </div>
                    <p className="text-xs text-slate-600">Configure your receipt and click Preview to see it here.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <Modal
        open={showReview}
        onClose={() => setShowReview(false)}
        title="Broadcast Review"
        size="lg"
      >
        <div className="flex flex-col gap-3 sm:gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
            {/* Left: Preview */}
            <div className="space-y-2 relative group">
              <div className="flex items-center justify-between">
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                  {previews.length > 1 ? `Sample ${activePreviewIndex + 1} of ${previews.length} (${previews[activePreviewIndex].accountName})` : 'Preview'}
                </p>
                <p className="text-[8px] text-slate-600 italic">Scroll to view full</p>
              </div>
              <div className="bg-slate-950 rounded-xl p-1.5 border border-slate-800 shadow-2xl overflow-hidden relative">
                {previews.length > 1 && (
                  <>
                    <button 
                      onClick={() => setActivePreviewIndex(prev => (prev === 0 ? previews.length - 1 : prev - 1))}
                      className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-1.5 bg-slate-900/90 border border-slate-700 rounded-full text-slate-400 hover:text-white transition-all"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button 
                      onClick={() => setActivePreviewIndex(prev => (prev === previews.length - 1 ? 0 : prev + 1))}
                      className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-1.5 bg-slate-900/90 border border-slate-700 rounded-full text-slate-400 hover:text-white transition-all"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </>
                )}
                <div className="max-h-[160px] sm:max-h-[450px] overflow-y-auto custom-scrollbar rounded-lg">
                  {previews.length > 0 && (
                    <img 
                      key={previews[activePreviewIndex].url}
                      src={previews[activePreviewIndex].url} 
                      alt="Final Receipt" 
                      className="w-full h-auto animate-in fade-in duration-300" 
                    />
                  )}
                </div>
              </div>
              {previews.length > 1 && (
                <div className="flex justify-center gap-1 mt-2">
                  {previews.map((_, idx) => (
                    <div key={idx} className={`h-0.5 rounded-full transition-all ${idx === activePreviewIndex ? 'w-4 bg-blue-500' : 'w-1 bg-slate-800'}`} />
                  ))}
                </div>
              )}
            </div>

            {/* Right: Routing & Caption */}
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Routing</p>
                <div className="space-y-2 max-h-[160px] md:max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                  {Object.entries(targetsBySource).map(([accountId, groupSet]) => {
                    const acc = accounts.find(a => a.id === accountId);
                    return (
                      <div key={accountId} className="p-2 rounded-xl bg-slate-900/50 border border-slate-800/50">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-[10px] font-bold text-blue-400 truncate">{acc ? getAccountDisplay(acc) : 'Acc'}</span>
                            <span className="text-slate-700">→</span>
                            <span className="text-[10px] text-slate-400 font-medium">{groupSet.size} targets</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {Array.from(groupSet).slice(0, 5).map(gId => {
                            const g = groups.find(group => group.id === gId);
                            return <span key={gId} className="text-[8px] px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-500 border border-slate-700/50">{g?.title || gId}</span>;
                          })}
                          {groupSet.size > 5 && <span className="text-[8px] text-slate-600">+{groupSet.size - 5} more</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/10">
                <p className="text-[9px] font-bold text-blue-400/70 uppercase tracking-widest mb-1">Caption</p>
                <p className="text-xs text-slate-400 italic line-clamp-2">{formData.message || '(No caption)'}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 pt-4 border-t border-slate-800">
            <Button 
              icon={Send} 
              onClick={() => handleBroadcast(true)} 
              loading={broadcasting} 
              className="flex-2 bg-emerald-500 hover:bg-emerald-400 shadow-lg shadow-emerald-500/10 h-11 text-xs font-bold order-1 sm:order-2"
            >
              Send Now
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => setShowReview(false)} 
              className="flex-1 h-11 text-xs text-slate-500 order-2 sm:order-1"
            >
              Back to Edit
            </Button>
          </div>
        </div>
      </Modal>
      {/* Mobile Sticky Action Bar */}
      <div className="fixed bottom-[92px] left-4 right-4 z-30 p-2 bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-[20px] lg:hidden animate-slide-up shadow-2xl shadow-blue-900/20">
        <div className="flex gap-2 w-full">
          <Button 
            variant="secondary" 
            size="sm"
            onClick={handlePreview} 
            loading={previewing} 
            className="flex-1 py-2.5 text-[11px] h-10 rounded-xl bg-slate-800/80"
          >
            Preview
          </Button>
          <Button 
            icon={selectedSourceAccounts.size > 0 && getTotalSelectedTargets() > 0 ? Send : Play} 
            onClick={handleGenerate} 
            loading={loading} 
            disabled={sendingState.active}
            className="flex-1 py-2.5 text-[11px] h-10 rounded-xl shadow-lg shadow-blue-500/20"
          >
            {sendingState.active ? 'Wait...' : (selectedSourceAccounts.size > 0 && getTotalSelectedTargets() > 0 ? 'Review & Send' : 'Generate')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GeneratorPage;
