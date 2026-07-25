import { Button } from '../ui/Button';
import { Sheet } from '../ui/Sheet';
import { TransactionForm } from './TransactionForm';
import type { Transaction, TransactionType } from '../../types';

interface Props {
  open: boolean;
  onClose: () => void;
  transaction?: Transaction;
  defaultType?: TransactionType;
}

const FORM_ID = 'transaction-form';

export function TransactionSheet({ open, onClose, transaction, defaultType }: Props) {
  if (!open) return null;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={transaction ? 'Editar movimiento' : 'Nuevo movimiento'}
      description="Los montos se guardan en pesos chilenos."
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form={FORM_ID} variant="primary">
            {transaction ? 'Guardar cambios' : 'Registrar'}
          </Button>
        </>
      }
    >
      <TransactionForm
        formId={FORM_ID}
        transaction={transaction}
        defaultType={defaultType}
        onDone={onClose}
      />
    </Sheet>
  );
}
