export type SyncStatus = 'pending' | 'synced';

export type AccountType = 'bank' | 'digital_wallet' | 'cash' | 'other';

export type CategoryType = 'expense' | 'income' | 'both';

export type TransactionType =
  | 'income'
  | 'expense'
  | 'transfer'
  | 'investment_contribution'
  | 'investment_withdrawal'
  | 'debt_payment';

export type InvestmentType = 'stock_cl' | 'stock_us' | 'crypto' | 'fund' | 'etf' | 'other';

export type ScheduledExpenseStatus = 'pending' | 'paid' | 'cancelled';

export type GoalStatus = 'active' | 'completed' | 'archived';

export interface User {
  id: string;
  email: string;
  name: string | null;
  createdAt: number;
}

export interface Account {
  id: string;
  userId: string;
  name: string;
  type: AccountType;
  currency: string;
  balance: number;
  color: string | null;
  icon: string | null;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
  syncStatus: SyncStatus;
}

export interface Category {
  id: string;
  userId: string;
  name: string;
  icon: string | null;
  color: string | null;
  type: CategoryType;
  isDefault: boolean;
  createdAt: number;
  syncStatus: SyncStatus;
}

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  accountId: string;
  toAccountId: string | null;
  investmentId: string | null;
  categoryId: string | null;
  description: string | null;
  date: number;
  notes: string | null;
  createdAt: number;
  updatedAt: number;
  syncStatus: SyncStatus;
}

export interface Investment {
  id: string;
  userId: string;
  name: string;
  type: InvestmentType;
  ticker: string | null;
  currentValue: number;
  currency: string;
  notes: string | null;
  createdAt: number;
  updatedAt: number;
  syncStatus: SyncStatus;
}

export interface InvestmentValueSnapshot {
  id: string;
  investmentId: string;
  value: number;
  date: number;
  createdAt: number;
  syncStatus: SyncStatus;
}

export interface ScheduledExpense {
  id: string;
  userId: string;
  name: string;
  amount: number;
  status: ScheduledExpenseStatus;
  estimatedDate: number;
  categoryId: string | null;
  linkedTransactionId: string | null;
  notes: string | null;
  createdAt: number;
  updatedAt: number;
  syncStatus: SyncStatus;
}

export interface Goal {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  targetDate: number | null;
  status: GoalStatus;
  notes: string | null;
  createdAt: number;
  updatedAt: number;
  syncStatus: SyncStatus;
}

export interface GoalAllocation {
  id: string;
  goalId: string;
  investmentId: string | null;
  accountId: string | null;
  targetAmount: number;
  createdAt: number;
  syncStatus: SyncStatus;
}

export interface InvestmentMetrics {
  investmentId: string;
  investedCapital: number;
  currentValue: number;
  gain: number;
  returnPct: number | null;
  monthlyReturnPct: number | null;
  annualReturnPct: number | null;
}

export interface GoalProgress {
  goalId: string;
  targetAmount: number;
  progress: number;
  progressPct: number;
  remaining: number;
  allocations: Array<{
    allocationId: string;
    label: string;
    targetAmount: number;
    progress: number;
    progressPct: number;
  }>;
}

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  income: 'Ingreso',
  expense: 'Gasto',
  transfer: 'Transferencia',
  investment_contribution: 'Aporte a inversión',
  investment_withdrawal: 'Retiro de inversión',
  debt_payment: 'Pago de deuda',
};

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  bank: 'Banco',
  digital_wallet: 'Billetera digital',
  cash: 'Efectivo',
  other: 'Otro',
};

export const INVESTMENT_TYPE_LABELS: Record<InvestmentType, string> = {
  stock_cl: 'Acción Chile',
  stock_us: 'Acción EE.UU.',
  crypto: 'Cripto',
  fund: 'Fondo mutuo',
  etf: 'ETF',
  other: 'Otro',
};

export const SCHEDULED_EXPENSE_STATUS_LABELS: Record<ScheduledExpenseStatus, string> = {
  pending: 'Pendiente',
  paid: 'Pagado',
  cancelled: 'Cancelado',
};

export const GOAL_STATUS_LABELS: Record<GoalStatus, string> = {
  active: 'Activo',
  completed: 'Completado',
  archived: 'Archivado',
};

export const LIQUID_ACCOUNT_TYPES: AccountType[] = ['bank', 'digital_wallet', 'cash', 'other'];
