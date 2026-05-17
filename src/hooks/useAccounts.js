/* This code fixed By Tg:@ImxCodex */
import { useState, useCallback } from 'react';
import { toArray } from '../utils/helpers';

/**
 * useAccounts — manages the accounts list + loading/error state.
 * Keeps server state local so modals can optimistically update it.
 */
export const useAccounts = (fetchFn) => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await fetchFn();
      setAccounts(toArray(data?.accounts, data?.items, data));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load accounts.');
    } finally {
      setLoading(false);
    }
  }, [fetchFn]);

  const remove = useCallback((id) => {
    setAccounts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const toggle = useCallback((id) => {
    setAccounts((prev) =>
      prev.map((a) => a.id === id ? { ...a, is_active: !a.is_active } : a)
    );
  }, []);

  const add = useCallback((account) => {
    setAccounts((prev) => [account, ...prev]);
  }, []);

  return { accounts, loading, error, load, remove, toggle, add };
};
