import type {
  Account,
  Goal,
  GoalAllocation,
  GoalProgress,
  Investment,
  InvestmentMetrics,
  InvestmentValueSnapshot,
  Transaction,
} from '../types';
import { LIQUID_ACCOUNT_TYPES, type TransactionType } from '../types';
import { startOfDay, startOfMonth, startOfYear } from './format';

export function investedCapital(transactions: Transaction[], investmentId: string): number {
  return transactions.reduce((total, tx) => {
    if (tx.investmentId !== investmentId) return total;
    if (tx.type === 'investment_contribution') return total + tx.amount;
    if (tx.type === 'investment_withdrawal') return total - tx.amount;
    return total;
  }, 0);
}

export function gain(currentValue: number, capital: number): number {
  return currentValue - capital;
}

export function returnPct(currentValue: number, capital: number): number | null {
  if (capital <= 0) return null;
  return (gain(currentValue, capital) / capital) * 100;
}

function snapshotValueAt(
  snapshots: InvestmentValueSnapshot[],
  investmentId: string,
  boundary: number,
): number | null {
  const candidates = snapshots
    .filter((snap) => snap.investmentId === investmentId && snap.date <= boundary)
    .sort((a, b) => b.date - a.date);
  return candidates.length > 0 ? candidates[0]!.value : null;
}

function capitalAt(transactions: Transaction[], investmentId: string, boundary: number): number {
  return investedCapital(
    transactions.filter((tx) => tx.date <= boundary),
    investmentId,
  );
}

function periodReturnPct(
  investment: Investment,
  transactions: Transaction[],
  snapshots: InvestmentValueSnapshot[],
  boundary: number,
): number | null {
  const currentCapital = investedCapital(transactions, investment.id);
  const currentPct = returnPct(investment.currentValue, currentCapital);
  if (currentPct === null) return null;

  const baseValue = snapshotValueAt(snapshots, investment.id, boundary);
  if (baseValue === null) return currentPct;

  const baseCapital = capitalAt(transactions, investment.id, boundary);
  const basePct = returnPct(baseValue, baseCapital);
  if (basePct === null) return currentPct;

  return currentPct - basePct;
}

export function investmentMetrics(
  investment: Investment,
  transactions: Transaction[],
  snapshots: InvestmentValueSnapshot[],
  now = Date.now(),
): InvestmentMetrics {
  const capital = investedCapital(transactions, investment.id);
  return {
    investmentId: investment.id,
    investedCapital: capital,
    currentValue: investment.currentValue,
    gain: gain(investment.currentValue, capital),
    returnPct: returnPct(investment.currentValue, capital),
    monthlyReturnPct: periodReturnPct(investment, transactions, snapshots, startOfMonth(now)),
    annualReturnPct: periodReturnPct(investment, transactions, snapshots, startOfYear(now)),
  };
}

export function portfolioMetrics(
  investments: Investment[],
  transactions: Transaction[],
  snapshots: InvestmentValueSnapshot[],
  now = Date.now(),
) {
  const perInvestment = investments.map((inv) =>
    investmentMetrics(inv, transactions, snapshots, now),
  );
  const totalCapital = perInvestment.reduce((sum, m) => sum + m.investedCapital, 0);
  const totalValue = perInvestment.reduce((sum, m) => sum + m.currentValue, 0);
  const monthBoundary = startOfMonth(now);
  const yearBoundary = startOfYear(now);

  const baseValueAt = (boundary: number) =>
    investments.reduce((sum, inv) => {
      const value = snapshotValueAt(snapshots, inv.id, boundary);
      return sum + (value ?? inv.currentValue);
    }, 0);

  const capitalAtBoundary = (boundary: number) =>
    investments.reduce((sum, inv) => sum + capitalAt(transactions, inv.id, boundary), 0);

  const totalPct = returnPct(totalValue, totalCapital);
  const monthPct = (() => {
    const base = returnPct(baseValueAt(monthBoundary), capitalAtBoundary(monthBoundary));
    if (totalPct === null) return null;
    return base === null ? totalPct : totalPct - base;
  })();
  const yearPct = (() => {
    const base = returnPct(baseValueAt(yearBoundary), capitalAtBoundary(yearBoundary));
    if (totalPct === null) return null;
    return base === null ? totalPct : totalPct - base;
  })();

  return {
    perInvestment,
    totalCapital,
    totalValue,
    totalGain: totalValue - totalCapital,
    totalReturnPct: totalPct,
    monthlyReturnPct: monthPct,
    annualReturnPct: yearPct,
  };
}

export function compareInvestments(metrics: InvestmentMetrics[]): InvestmentMetrics[] {
  return [...metrics].sort((a, b) => (b.returnPct ?? -Infinity) - (a.returnPct ?? -Infinity));
}

export function accountBalance(account: Account, transactions: Transaction[]): number {
  return transactions.reduce((balance, tx) => {
    if (tx.accountId === account.id) {
      if (tx.type === 'income' || tx.type === 'investment_withdrawal') return balance + tx.amount;
      return balance - tx.amount;
    }
    if (tx.toAccountId === account.id && tx.type === 'transfer') {
      return balance + tx.amount;
    }
    return balance;
  }, 0);
}

export function accountBalances(
  accounts: Account[],
  transactions: Transaction[],
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const account of accounts) {
    result[account.id] = accountBalance(account, transactions);
  }
  return result;
}

export function liquidTotal(accounts: Account[], transactions: Transaction[]): number {
  return accounts
    .filter((account) => account.isActive && LIQUID_ACCOUNT_TYPES.includes(account.type))
    .reduce((sum, account) => sum + accountBalance(account, transactions), 0);
}

export function patrimonyTotal(
  accounts: Account[],
  investments: Investment[],
  transactions: Transaction[],
): number {
  const investmentValue = investments.reduce((sum, inv) => sum + inv.currentValue, 0);
  return liquidTotal(accounts, transactions) + investmentValue;
}

export function goalProgress(
  goal: Goal,
  allocations: GoalAllocation[],
  transactions: Transaction[],
  accounts: Account[],
  investments: Investment[],
): GoalProgress {
  const goalAllocations = allocations.filter((alloc) => alloc.goalId === goal.id);
  const createdAtStartOfDay = startOfDay(goal.createdAt);

  const allocationProgress = goalAllocations.map((alloc) => {
    const contributions = transactions.filter((tx) => {
      if (tx.date < createdAtStartOfDay) return false;
      if (alloc.investmentId && tx.investmentId === alloc.investmentId) {
        return tx.type === 'investment_contribution' || tx.type === 'investment_withdrawal';
      }
      if (alloc.accountId && tx.toAccountId === alloc.accountId) {
        return tx.type === 'transfer';
      }
      return false;
    });

    const progress = contributions.reduce((sum, tx) => {
      if (tx.type === 'investment_withdrawal') return sum - tx.amount;
      return sum + tx.amount;
    }, 0);

    const label =
      investments.find((inv) => inv.id === alloc.investmentId)?.name ??
      accounts.find((acc) => acc.id === alloc.accountId)?.name ??
      'Destino';

    return {
      allocationId: alloc.id,
      label,
      targetAmount: alloc.targetAmount,
      progress: Math.max(progress, 0),
      progressPct:
        alloc.targetAmount > 0
          ? Math.min((Math.max(progress, 0) / alloc.targetAmount) * 100, 100)
          : 0,
    };
  });

  const progress = allocationProgress.reduce((sum, alloc) => sum + alloc.progress, 0);

  return {
    goalId: goal.id,
    targetAmount: goal.targetAmount,
    progress,
    progressPct: goal.targetAmount > 0 ? Math.min((progress / goal.targetAmount) * 100, 100) : 0,
    remaining: Math.max(goal.targetAmount - progress, 0),
    allocations: allocationProgress,
  };
}

export function isExpenseType(type: TransactionType): boolean {
  return type === 'expense' || type === 'debt_payment';
}

export function isIncomeType(type: TransactionType): boolean {
  return type === 'income';
}

export function signedAmount(tx: Transaction): number {
  if (isIncomeType(tx.type)) return tx.amount;
  if (isExpenseType(tx.type)) return -tx.amount;
  if (tx.type === 'investment_contribution') return -tx.amount;
  if (tx.type === 'investment_withdrawal') return tx.amount;
  return 0;
}
