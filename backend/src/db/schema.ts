import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  name: text('name'),
  createdAt: integer('created_at').notNull(),
});

export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  name: text('name').notNull(),
  type: text('type').notNull(),
  currency: text('currency').notNull().default('CLP'),
  balance: integer('balance').notNull().default(0),
  color: text('color'),
  icon: text('icon'),
  isActive: integer('is_active').default(1),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  name: text('name').notNull(),
  icon: text('icon'),
  color: text('color'),
  type: text('type').notNull(),
  isDefault: integer('is_default').default(0),
  syncStatus: text('sync_status').notNull().default('synced'),
  createdAt: integer('created_at').notNull(),
});

export const transactions = sqliteTable('transactions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  type: text('type').notNull(),
  amount: integer('amount').notNull(),
  accountId: text('account_id').notNull().references(() => accounts.id),
  toAccountId: text('to_account_id').references(() => accounts.id),
  investmentId: text('investment_id'),
  categoryId: text('category_id').references(() => categories.id),
  description: text('description'),
  date: integer('date').notNull(),
  notes: text('notes'),
  syncStatus: text('sync_status').default('synced'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const investments = sqliteTable('investments', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  name: text('name').notNull(),
  type: text('type').notNull(),
  ticker: text('ticker'),
  currentValue: integer('current_value').notNull(),
  currency: text('currency').default('CLP'),
  notes: text('notes'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const investmentValueSnapshots = sqliteTable('investment_value_snapshots', {
  id: text('id').primaryKey(),
  investmentId: text('investment_id').notNull().references(() => investments.id),
  value: integer('value').notNull(),
  date: integer('date').notNull(),
  createdAt: integer('created_at').notNull(),
  syncStatus: text('sync_status').notNull().default('synced'),
});

export const scheduledExpenses = sqliteTable('scheduled_expenses', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  name: text('name').notNull(),
  amount: integer('amount').notNull(),
  status: text('status').notNull().default('pending'),
  estimatedDate: integer('estimated_date').notNull(),
  categoryId: text('category_id').references(() => categories.id),
  linkedTransactionId: text('linked_transaction_id'),
  notes: text('notes'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const goals = sqliteTable('goals', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  name: text('name').notNull(),
  targetAmount: integer('target_amount').notNull(),
  targetDate: integer('target_date'),
  status: text('status').notNull().default('active'),
  notes: text('notes'),
  syncStatus: text('sync_status').notNull().default('synced'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const goalAllocations = sqliteTable('goal_allocations', {
  id: text('id').primaryKey(),
  goalId: text('goal_id').notNull().references(() => goals.id),
  investmentId: text('investment_id'),
  accountId: text('account_id'),
  targetAmount: integer('target_amount').notNull(),
  syncStatus: text('sync_status').notNull().default('synced'),
  createdAt: integer('created_at').notNull(),
});
