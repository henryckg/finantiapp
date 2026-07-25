import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../ui/Button';
import { FieldRow, Input, MoneyInput, Select, Textarea } from '../ui/Field';
import { TRANSACTION_TYPE_LABELS, type Transaction, type TransactionType } from '../../types';
import { useDataStore } from '../../store/data';
import { centsToUnits, fromDateInputValue, toDateInputValue, unitsToCents } from '../../lib/format';

const schema = z
  .object({
    type: z.enum([
      'income',
      'expense',
      'transfer',
      'investment_contribution',
      'investment_withdrawal',
      'debt_payment',
    ]),
    amount: z.coerce.number().positive('Ingresa un monto mayor a 0'),
    accountId: z.string().min(1, 'Selecciona una cuenta'),
    toAccountId: z.string().optional(),
    investmentId: z.string().optional(),
    categoryId: z.string().optional(),
    description: z.string().optional(),
    date: z.string().min(1, 'Selecciona una fecha'),
    notes: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.type === 'transfer') {
      if (!value.toAccountId) {
        ctx.addIssue({
          code: 'custom',
          path: ['toAccountId'],
          message: 'Selecciona la cuenta destino',
        });
      } else if (value.toAccountId === value.accountId) {
        ctx.addIssue({
          code: 'custom',
          path: ['toAccountId'],
          message: 'Debe ser distinta al origen',
        });
      }
    }
    if (
      (value.type === 'investment_contribution' || value.type === 'investment_withdrawal') &&
      !value.investmentId
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['investmentId'],
        message: 'Selecciona la inversión',
      });
    }
    if ((value.type === 'income' || value.type === 'expense') && !value.categoryId) {
      ctx.addIssue({ code: 'custom', path: ['categoryId'], message: 'Selecciona una categoría' });
    }
  });

type FormValues = z.input<typeof schema>;

interface Props {
  transaction?: Transaction;
  defaultType?: TransactionType;
  onDone: () => void;
  formId?: string;
}

export function TransactionForm({ transaction, defaultType = 'expense', onDone, formId }: Props) {
  const accounts = useDataStore((state) => state.accounts);
  const categories = useDataStore((state) => state.categories);
  const investments = useDataStore((state) => state.investments);
  const createTransaction = useDataStore((state) => state.createTransaction);
  const updateTransaction = useDataStore((state) => state.updateTransaction);

  const debtCategory = useMemo(
    () => categories.find((category) => category.name === 'Deudas'),
    [categories],
  );

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: transaction?.type ?? defaultType,
      amount: transaction ? centsToUnits(transaction.amount) : ('' as unknown as number),
      accountId: transaction?.accountId ?? accounts[0]?.id ?? '',
      toAccountId: transaction?.toAccountId ?? '',
      investmentId: transaction?.investmentId ?? '',
      categoryId: transaction?.categoryId ?? '',
      description: transaction?.description ?? '',
      date: toDateInputValue(transaction?.date ?? Date.now()),
      notes: transaction?.notes ?? '',
    },
  });

  const type = watch('type') as TransactionType;
  const isTransfer = type === 'transfer';
  const isInvestment = type === 'investment_contribution' || type === 'investment_withdrawal';
  const isDebt = type === 'debt_payment';
  const showCategory = type === 'income' || type === 'expense';

  const availableCategories = categories.filter((category) => {
    if (type === 'income') return category.type === 'income' || category.type === 'both';
    return category.type === 'expense' || category.type === 'both';
  });

  const onSubmit = handleSubmit(async (values) => {
    const payload = {
      type: values.type as TransactionType,
      amount: unitsToCents(Number(values.amount)),
      accountId: values.accountId,
      toAccountId: values.type === 'transfer' ? (values.toAccountId ?? null) : null,
      investmentId: isInvestment ? (values.investmentId ?? null) : null,
      categoryId: isDebt
        ? (debtCategory?.id ?? null)
        : showCategory
          ? (values.categoryId ?? null)
          : null,
      description: values.description?.trim() ? values.description.trim() : null,
      date: fromDateInputValue(values.date),
      notes: values.notes?.trim() ? values.notes.trim() : null,
    };

    if (transaction) {
      await updateTransaction(transaction.id, payload);
    } else {
      await createTransaction(payload);
    }
    onDone();
  });

  return (
    <form id={formId} onSubmit={onSubmit} className="flex flex-col gap-3.5">
      <FieldRow label="Tipo" error={errors.type?.message}>
        <Select {...register('type')}>
          {Object.entries(TRANSACTION_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </FieldRow>

      <FieldRow label="Monto" error={errors.amount?.message}>
        <MoneyInput step="1" min="0" {...register('amount')} />
      </FieldRow>

      <FieldRow
        label={isTransfer ? 'Cuenta origen' : 'Cuenta'}
        error={errors.accountId?.message}
      >
        <Select {...register('accountId')}>
          <option value="">Selecciona…</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </Select>
      </FieldRow>

      {isTransfer && (
        <FieldRow label="Cuenta destino" error={errors.toAccountId?.message}>
          <Select {...register('toAccountId')}>
            <option value="">Selecciona…</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </Select>
        </FieldRow>
      )}

      {isInvestment && (
        <FieldRow label="Inversión" error={errors.investmentId?.message}>
          <Select {...register('investmentId')}>
            <option value="">Selecciona…</option>
            {investments.map((investment) => (
              <option key={investment.id} value={investment.id}>
                {investment.name}
              </option>
            ))}
          </Select>
        </FieldRow>
      )}

      {showCategory && (
        <FieldRow label="Categoría" error={errors.categoryId?.message}>
          <Select {...register('categoryId')}>
            <option value="">Selecciona…</option>
            {availableCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        </FieldRow>
      )}

      {isDebt && (
        <FieldRow label="Categoría" hint="Se asigna automáticamente a “Deudas”.">
          <Input value={debtCategory?.name ?? 'Deudas'} readOnly disabled />
        </FieldRow>
      )}

      <FieldRow label="Fecha" error={errors.date?.message}>
        <Input type="date" {...register('date')} />
      </FieldRow>

      <FieldRow label="Descripción">
        <Input placeholder="Opcional" {...register('description')} />
      </FieldRow>

      <FieldRow label="Notas">
        <Textarea placeholder="Opcional" {...register('notes')} />
      </FieldRow>

      {!formId && (
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onDone}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {transaction ? 'Guardar cambios' : 'Registrar'}
          </Button>
        </div>
      )}
    </form>
  );
}
