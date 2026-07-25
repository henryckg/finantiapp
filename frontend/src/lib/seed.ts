import type {
  Account,
  Category,
  Goal,
  GoalAllocation,
  Investment,
  InvestmentValueSnapshot,
  ScheduledExpense,
  Transaction,
} from '../types';
import { DEMO_USER } from './config';
import { investedCapital } from './profitability';

const USER_ID = DEMO_USER.id;

function daysAgo(days: number): number {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - days);
  return date.getTime();
}

function daysAhead(days: number): number {
  return daysAgo(-days);
}

function monthsAgoStart(months: number): number {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth() - months, 1, 12, 0, 0, 0).getTime();
}

const CREATED = daysAgo(400);

export const DEFAULT_CATEGORIES: Category[] = [
  ['Alimentación', 'expense', 'utensils', '#F0654A'],
  ['Transporte', 'expense', 'car', '#E5A050'],
  ['Vivienda', 'expense', 'home', '#5E6AD2'],
  ['Salud', 'expense', 'heart-pulse', '#4CC38A'],
  ['Educación', 'expense', 'graduation-cap', '#7C89E8'],
  ['Entretención', 'expense', 'gamepad-2', '#C061CB'],
  ['Ropa', 'expense', 'shirt', '#D9739B'],
  ['Tecnología', 'expense', 'cpu', '#4A9CF0'],
  ['Servicios', 'expense', 'plug-zap', '#6BAF92'],
  ['Deudas', 'expense', 'credit-card', '#F04A4A'],
  ['Otros', 'expense', 'circle-dashed', '#9B9BA3'],
  ['Sueldo', 'income', 'briefcase', '#4CC38A'],
  ['Freelance', 'income', 'laptop', '#57C7B8'],
  ['Inversiones', 'income', 'trending-up', '#5E6AD2'],
  ['Regalo', 'income', 'gift', '#C061CB'],
  ['Otros ingresos', 'income', 'circle-dashed', '#9B9BA3'],
].map(([name, type, icon, color], index) => ({
  id: `cat-${index + 1}`,
  userId: USER_ID,
  name: name as string,
  icon: icon as string,
  color: color as string,
  type: type as Category['type'],
  isDefault: true,
  createdAt: CREATED,
  syncStatus: 'synced' as const,
}));

const CAT = Object.fromEntries(DEFAULT_CATEGORIES.map((c) => [c.name, c.id])) as Record<
  string,
  string
>;

export const DEMO_ACCOUNTS: Account[] = [
  {
    id: 'acc-bci',
    userId: USER_ID,
    name: 'BCI Cuenta Corriente',
    type: 'bank',
    currency: 'CLP',
    balance: 0,
    color: '#5E6AD2',
    icon: 'landmark',
    isActive: true,
    createdAt: CREATED,
    updatedAt: CREATED,
    syncStatus: 'synced',
  },
  {
    id: 'acc-santander',
    userId: USER_ID,
    name: 'Santander',
    type: 'bank',
    currency: 'CLP',
    balance: 0,
    color: '#F0654A',
    icon: 'piggy-bank',
    isActive: true,
    createdAt: CREATED,
    updatedAt: CREATED,
    syncStatus: 'synced',
  },
  {
    id: 'acc-mercadopago',
    userId: USER_ID,
    name: 'Mercado Pago',
    type: 'digital_wallet',
    currency: 'CLP',
    balance: 0,
    color: '#4A9CF0',
    icon: 'wallet',
    isActive: true,
    createdAt: CREATED,
    updatedAt: CREATED,
    syncStatus: 'synced',
  },
  {
    id: 'acc-efectivo',
    userId: USER_ID,
    name: 'Efectivo',
    type: 'cash',
    currency: 'CLP',
    balance: 0,
    color: '#4CC38A',
    icon: 'banknote',
    isActive: true,
    createdAt: CREATED,
    updatedAt: CREATED,
    syncStatus: 'synced',
  },
];

interface InvestmentDef extends Omit<Investment, 'currentValue'> {
  /** Ganancia acumulada objetivo sobre el capital aportado. */
  gainRatio: number;
  /** Crecimiento mensual usado para reconstruir el historial de valores. */
  monthlyGrowth: number;
}

const INVESTMENT_DEFS: InvestmentDef[] = [
  {
    id: 'inv-copec',
    userId: USER_ID,
    name: 'Copec',
    type: 'stock_cl',
    ticker: 'COPEC',
    gainRatio: 0.124,
    monthlyGrowth: 0.011,
    currency: 'CLP',
    notes: 'Acción chilena, posición de largo plazo.',
    createdAt: monthsAgoStart(11),
    updatedAt: daysAgo(3),
    syncStatus: 'synced',
  },
  {
    id: 'inv-sp500',
    userId: USER_ID,
    name: 'S&P 500 ETF',
    type: 'etf',
    ticker: 'VOO',
    gainRatio: 0.186,
    monthlyGrowth: 0.018,
    currency: 'CLP',
    notes: 'Exposición global vía ETF.',
    createdAt: monthsAgoStart(10),
    updatedAt: daysAgo(2),
    syncStatus: 'synced',
  },
  {
    id: 'inv-fondo-mp',
    userId: USER_ID,
    name: 'Fondo Mercado Pago',
    type: 'fund',
    ticker: null,
    gainRatio: 0.058,
    monthlyGrowth: 0.006,
    currency: 'CLP',
    notes: 'Rendimiento diario de saldo.',
    createdAt: monthsAgoStart(8),
    updatedAt: daysAgo(1),
    syncStatus: 'synced',
  },
  {
    id: 'inv-btc',
    userId: USER_ID,
    name: 'Bitcoin',
    type: 'crypto',
    ticker: 'BTC',
    gainRatio: 0.312,
    monthlyGrowth: 0.032,
    currency: 'CLP',
    notes: 'Posición especulativa pequeña.',
    createdAt: monthsAgoStart(6),
    updatedAt: daysAgo(1),
    syncStatus: 'synced',
  },
];

let txCounter = 0;
function tx(partial: Omit<Transaction, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'syncStatus'>): Transaction {
  txCounter += 1;
  return {
    id: `tx-${txCounter}`,
    userId: USER_ID,
    createdAt: partial.date,
    updatedAt: partial.date,
    syncStatus: 'synced',
    ...partial,
  };
}

function buildTransactions(): Transaction[] {
  const list: Transaction[] = [];

  for (let monthOffset = 11; monthOffset >= 0; monthOffset -= 1) {
    const base = new Date(monthsAgoStart(monthOffset));
    const year = base.getFullYear();
    const month = base.getMonth();
    const at = (day: number) => new Date(year, month, day, 12, 0, 0, 0).getTime();
    const isCurrentMonth = monthOffset === 0;
    const today = new Date().getDate();
    const allow = (day: number) => !isCurrentMonth || day <= today;

    if (allow(5)) {
      list.push(
        tx({
          type: 'income',
          amount: 1_850_000_00,
          accountId: 'acc-bci',
          toAccountId: null,
          investmentId: null,
          categoryId: CAT['Sueldo']!,
          description: 'Sueldo mensual',
          date: at(5),
          notes: null,
        }),
      );
    }

    if (monthOffset % 3 === 0 && allow(12)) {
      list.push(
        tx({
          type: 'income',
          amount: 320_000_00,
          accountId: 'acc-mercadopago',
          toAccountId: null,
          investmentId: null,
          categoryId: CAT['Freelance']!,
          description: 'Proyecto freelance',
          date: at(12),
          notes: null,
        }),
      );
    }

    const expenses: Array<[number, string, number, string, string]> = [
      [6, 'Vivienda', 520_000_00, 'Arriendo', 'acc-bci'],
      [8, 'Servicios', 68_400_00, 'Luz y agua', 'acc-bci'],
      [9, 'Servicios', 34_900_00, 'Internet', 'acc-bci'],
      [10, 'Alimentación', 185_600_00, 'Supermercado', 'acc-bci'],
      [14, 'Transporte', 62_300_00, 'Bencina', 'acc-mercadopago'],
      [16, 'Alimentación', 42_800_00, 'Feria', 'acc-efectivo'],
      [18, 'Entretención', 28_900_00, 'Streaming y salidas', 'acc-mercadopago'],
      [21, 'Salud', 45_000_00, 'Consulta médica', 'acc-bci'],
      [23, 'Alimentación', 96_500_00, 'Supermercado quincena', 'acc-bci'],
      [25, 'Transporte', 19_800_00, 'Metro y micro', 'acc-efectivo'],
    ];

    for (const [day, category, amount, description, accountId] of expenses) {
      if (!allow(day)) continue;
      const jitter = 1 + ((monthOffset * 7 + day) % 11) / 100;
      list.push(
        tx({
          type: 'expense',
          amount: Math.round((amount * jitter) / 100) * 100,
          accountId,
          toAccountId: null,
          investmentId: null,
          categoryId: CAT[category]!,
          description,
          date: at(day),
          notes: null,
        }),
      );
    }

    if (monthOffset % 2 === 0 && allow(19)) {
      list.push(
        tx({
          type: 'expense',
          amount: 74_900_00,
          accountId: 'acc-mercadopago',
          toAccountId: null,
          investmentId: null,
          categoryId: CAT['Tecnología']!,
          description: 'Accesorios',
          date: at(19),
          notes: null,
        }),
      );
    }

    if (allow(7)) {
      list.push(
        tx({
          type: 'debt_payment',
          amount: 120_000_00,
          accountId: 'acc-bci',
          toAccountId: null,
          investmentId: null,
          categoryId: CAT['Deudas']!,
          description: 'Cuota crédito de consumo',
          date: at(7),
          notes: null,
        }),
      );
    }

    const transfers: Array<[number, string, number, string]> = [
      [6, 'acc-santander', 200_000_00, 'Ahorro mensual'],
      [6, 'acc-mercadopago', 60_000_00, 'Carga Mercado Pago'],
      [6, 'acc-efectivo', 70_000_00, 'Retiro en efectivo'],
    ];

    for (const [day, toAccountId, amount, description] of transfers) {
      if (!allow(day)) continue;
      list.push(
        tx({
          type: 'transfer',
          amount,
          accountId: 'acc-bci',
          toAccountId,
          investmentId: null,
          categoryId: null,
          description,
          date: at(day),
          notes: null,
        }),
      );
    }

    const contributions: Array<[number, string, number]> = [
      [11, 'inv-copec', 80_000_00],
      [11, 'inv-sp500', 150_000_00],
      [20, 'inv-fondo-mp', 40_000_00],
    ];

    for (const [day, investmentId, amount] of contributions) {
      if (!allow(day)) continue;
      const investment = INVESTMENT_DEFS.find((inv) => inv.id === investmentId)!;
      if (at(day) < investment.createdAt) continue;
      list.push(
        tx({
          type: 'investment_contribution',
          amount,
          accountId: 'acc-bci',
          toAccountId: null,
          investmentId,
          categoryId: null,
          description: `Aporte ${investment.name}`,
          date: at(day),
          notes: null,
        }),
      );
    }

    if (monthOffset === 5) {
      list.push(
        tx({
          type: 'investment_contribution',
          amount: 90_000_00,
          accountId: 'acc-mercadopago',
          toAccountId: null,
          investmentId: 'inv-btc',
          categoryId: null,
          description: 'Aporte Bitcoin',
          date: at(15),
          notes: 'Compra inicial',
        }),
      );
    }

    if (monthOffset === 2) {
      list.push(
        tx({
          type: 'investment_withdrawal',
          amount: 60_000_00,
          accountId: 'acc-bci',
          toAccountId: null,
          investmentId: 'inv-fondo-mp',
          categoryId: null,
          description: 'Retiro parcial Fondo Mercado Pago',
          date: at(22),
          notes: null,
        }),
      );
    }
  }

  return list.sort((a, b) => b.date - a.date);
}

export const DEMO_TRANSACTIONS: Transaction[] = buildTransactions();

export const DEMO_INVESTMENTS: Investment[] = INVESTMENT_DEFS.map(
  ({ gainRatio, monthlyGrowth: _monthlyGrowth, ...investment }) => {
    const capital = investedCapital(DEMO_TRANSACTIONS, investment.id);
    return {
      ...investment,
      currentValue: Math.round((capital * (1 + gainRatio)) / 100) * 100,
    };
  },
);

function buildSnapshots(): InvestmentValueSnapshot[] {
  const snapshots: InvestmentValueSnapshot[] = [];
  let counter = 0;

  for (const def of INVESTMENT_DEFS) {
    const monthsActive = Math.max(
      1,
      Math.round((Date.now() - def.createdAt) / (30 * 86_400_000)),
    );
    const investment = DEMO_INVESTMENTS.find((item) => item.id === def.id)!;

    for (let offset = monthsActive; offset >= 0; offset -= 1) {
      const date = new Date(monthsAgoStart(offset));
      date.setMonth(date.getMonth() + 1);
      date.setDate(0);
      date.setHours(23, 59, 0, 0);
      const boundary = Math.min(date.getTime(), Date.now());
      if (boundary < def.createdAt) continue;

      const capitalAtDate = investedCapital(
        DEMO_TRANSACTIONS.filter((tx) => tx.date <= boundary),
        def.id,
      );
      if (capitalAtDate <= 0) continue;

      const elapsed = ((monthsActive - offset) / monthsActive) ** 1.8;
      const value = Math.round((capitalAtDate * (1 + def.gainRatio * elapsed)) / 100) * 100;
      counter += 1;
      snapshots.push({
        id: `snap-${counter}`,
        investmentId: def.id,
        value,
        date: boundary,
        createdAt: boundary,
        syncStatus: 'synced',
      });
    }
    counter += 1;
    snapshots.push({
      id: `snap-${counter}`,
      investmentId: investment.id,
      value: investment.currentValue,
      date: investment.updatedAt,
      createdAt: investment.updatedAt,
      syncStatus: 'synced',
    });
  }

  return snapshots.sort((a, b) => a.date - b.date);
}

export const DEMO_SNAPSHOTS: InvestmentValueSnapshot[] = buildSnapshots();

export const DEMO_SCHEDULED_EXPENSES: ScheduledExpense[] = [
  {
    id: 'sch-1',
    userId: USER_ID,
    name: 'Sofá living',
    amount: 480_000_00,
    status: 'pending',
    estimatedDate: daysAhead(12),
    categoryId: CAT['Vivienda']!,
    linkedTransactionId: null,
    notes: 'Cotizado en dos tiendas.',
    createdAt: daysAgo(20),
    updatedAt: daysAgo(20),
    syncStatus: 'synced',
  },
  {
    id: 'sch-2',
    userId: USER_ID,
    name: 'Reloj',
    amount: 220_000_00,
    status: 'pending',
    estimatedDate: daysAhead(28),
    categoryId: CAT['Ropa']!,
    linkedTransactionId: null,
    notes: null,
    createdAt: daysAgo(15),
    updatedAt: daysAgo(15),
    syncStatus: 'synced',
  },
  {
    id: 'sch-3',
    userId: USER_ID,
    name: 'Cena aniversario',
    amount: 95_000_00,
    status: 'pending',
    estimatedDate: daysAhead(5),
    categoryId: CAT['Entretención']!,
    linkedTransactionId: null,
    notes: 'Reservar mesa.',
    createdAt: daysAgo(8),
    updatedAt: daysAgo(8),
    syncStatus: 'synced',
  },
  {
    id: 'sch-4',
    userId: USER_ID,
    name: 'Notebook nuevo',
    amount: 1_100_000_00,
    status: 'pending',
    estimatedDate: daysAhead(75),
    categoryId: CAT['Tecnología']!,
    linkedTransactionId: null,
    notes: null,
    createdAt: daysAgo(30),
    updatedAt: daysAgo(30),
    syncStatus: 'synced',
  },
  {
    id: 'sch-5',
    userId: USER_ID,
    name: 'Seguro auto',
    amount: 310_000_00,
    status: 'paid',
    estimatedDate: daysAgo(18),
    categoryId: CAT['Servicios']!,
    linkedTransactionId: null,
    notes: 'Pagado en cuotas.',
    createdAt: daysAgo(60),
    updatedAt: daysAgo(18),
    syncStatus: 'synced',
  },
  {
    id: 'sch-6',
    userId: USER_ID,
    name: 'Curso de inglés',
    amount: 260_000_00,
    status: 'cancelled',
    estimatedDate: daysAgo(5),
    categoryId: CAT['Educación']!,
    linkedTransactionId: null,
    notes: 'Postergado al próximo semestre.',
    createdAt: daysAgo(45),
    updatedAt: daysAgo(6),
    syncStatus: 'synced',
  },
];

export const DEMO_GOALS: Goal[] = [
  {
    id: 'goal-1',
    userId: USER_ID,
    name: 'Invertir $785.000',
    targetAmount: 785_000_00,
    targetDate: daysAhead(120),
    status: 'active',
    notes: 'Distribuido entre ETF y acción chilena.',
    createdAt: monthsAgoStart(3),
    updatedAt: daysAgo(4),
    syncStatus: 'synced',
  },
  {
    id: 'goal-2',
    userId: USER_ID,
    name: 'Fondo de emergencia',
    targetAmount: 3_000_000_00,
    targetDate: daysAhead(300),
    status: 'active',
    notes: 'Seis meses de gastos fijos.',
    createdAt: monthsAgoStart(6),
    updatedAt: daysAgo(6),
    syncStatus: 'synced',
  },
  {
    id: 'goal-3',
    userId: USER_ID,
    name: 'Viaje 2027',
    targetAmount: 1_500_000_00,
    targetDate: daysAhead(420),
    status: 'active',
    notes: null,
    createdAt: monthsAgoStart(2),
    updatedAt: daysAgo(10),
    syncStatus: 'synced',
  },
];

export const DEMO_GOAL_ALLOCATIONS: GoalAllocation[] = [
  {
    id: 'alloc-1',
    goalId: 'goal-1',
    investmentId: 'inv-sp500',
    accountId: null,
    targetAmount: 485_000_00,
    createdAt: monthsAgoStart(3),
    syncStatus: 'synced',
  },
  {
    id: 'alloc-2',
    goalId: 'goal-1',
    investmentId: 'inv-copec',
    accountId: null,
    targetAmount: 300_000_00,
    createdAt: monthsAgoStart(3),
    syncStatus: 'synced',
  },
  {
    id: 'alloc-3',
    goalId: 'goal-2',
    investmentId: null,
    accountId: 'acc-santander',
    targetAmount: 3_000_000_00,
    createdAt: monthsAgoStart(6),
    syncStatus: 'synced',
  },
  {
    id: 'alloc-4',
    goalId: 'goal-3',
    investmentId: null,
    accountId: 'acc-santander',
    targetAmount: 900_000_00,
    createdAt: monthsAgoStart(2),
    syncStatus: 'synced',
  },
  {
    id: 'alloc-5',
    goalId: 'goal-3',
    investmentId: 'inv-fondo-mp',
    accountId: null,
    targetAmount: 600_000_00,
    createdAt: monthsAgoStart(2),
    syncStatus: 'synced',
  },
];

export const DEMO_SEED = {
  user: DEMO_USER,
  accounts: DEMO_ACCOUNTS,
  categories: DEFAULT_CATEGORIES,
  transactions: DEMO_TRANSACTIONS,
  investments: DEMO_INVESTMENTS,
  snapshots: DEMO_SNAPSHOTS,
  scheduledExpenses: DEMO_SCHEDULED_EXPENSES,
  goals: DEMO_GOALS,
  goalAllocations: DEMO_GOAL_ALLOCATIONS,
};
