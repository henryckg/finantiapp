import { useEffect, useMemo } from 'react';
import { useDataStore } from '../store/data';
import { useAuthStore } from '../store/auth';
import { accountBalances, portfolioMetrics } from '../lib/profitability';

export function useAppData() {
  const store = useDataStore();
  const initAuth = useAuthStore((state) => state.init);
  const user = useAuthStore((state) => state.user);
  const loading = useAuthStore((state) => state.loading);
  const isDemo = useAuthStore((state) => state.isDemo);

  useEffect(() => {
    void initAuth();
    if (!useDataStore.getState().ready && !useDataStore.getState().loading) {
      void useDataStore.getState().load();
    }
  }, [initAuth]);

  useEffect(() => {
    if (!isDemo && !loading && !user) {
      window.location.href = '/login';
    }
  }, [isDemo, loading, user]);

  return store;
}

export function useAccountBalances() {
  const accounts = useDataStore((state) => state.accounts);
  const transactions = useDataStore((state) => state.transactions);
  return useMemo(() => accountBalances(accounts, transactions), [accounts, transactions]);
}

export function usePortfolio() {
  const investments = useDataStore((state) => state.investments);
  const transactions = useDataStore((state) => state.transactions);
  const snapshots = useDataStore((state) => state.snapshots);
  return useMemo(
    () => portfolioMetrics(investments, transactions, snapshots),
    [investments, transactions, snapshots],
  );
}

export function useCategoryMap() {
  const categories = useDataStore((state) => state.categories);
  return useMemo(
    () => Object.fromEntries(categories.map((category) => [category.id, category])),
    [categories],
  );
}

export function useAccountMap() {
  const accounts = useDataStore((state) => state.accounts);
  return useMemo(() => Object.fromEntries(accounts.map((account) => [account.id, account])), [
    accounts,
  ]);
}

export function useInvestmentMap() {
  const investments = useDataStore((state) => state.investments);
  return useMemo(
    () => Object.fromEntries(investments.map((investment) => [investment.id, investment])),
    [investments],
  );
}
