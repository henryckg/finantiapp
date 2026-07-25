import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useAppData } from '../hooks/useAppData';
import { formatMoney } from '../lib/format';
import { cn } from '../lib/utils';

interface Item {
  id: string;
  label: string;
  hint: string;
  href: string;
  group: string;
}

const PAGES: Item[] = [
  { id: 'p-dashboard', label: 'Dashboard', hint: 'Resumen general', href: '/dashboard', group: 'Ir a' },
  { id: 'p-mov', label: 'Movimientos', hint: 'Historial', href: '/movimientos', group: 'Ir a' },
  { id: 'p-acc', label: 'Cuentas', hint: 'Saldos', href: '/cuentas', group: 'Ir a' },
  { id: 'p-inv', label: 'Inversiones', hint: 'Rentabilidad', href: '/inversiones', group: 'Ir a' },
  {
    id: 'p-sch',
    label: 'Gastos programados',
    hint: 'Planificación',
    href: '/gastos-programados',
    group: 'Ir a',
  },
  { id: 'p-goal', label: 'Objetivos', hint: 'Metas', href: '/objetivos', group: 'Ir a' },
  { id: 'p-rep', label: 'Reportes', hint: 'Gráficos', href: '/reportes', group: 'Ir a' },
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const { accounts, investments, goals } = useAppData();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((value) => !value);
      }
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const items = useMemo<Item[]>(() => {
    const accountItems: Item[] = accounts.map((account) => ({
      id: `acc-${account.id}`,
      label: account.name,
      hint: 'Cuenta',
      href: `/cuentas?cuenta=${account.id}`,
      group: 'Cuentas',
    }));
    const investmentItems: Item[] = investments.map((investment) => ({
      id: `inv-${investment.id}`,
      label: investment.name,
      hint: formatMoney(investment.currentValue),
      href: `/inversiones?inversion=${investment.id}`,
      group: 'Inversiones',
    }));
    const goalItems: Item[] = goals.map((goal) => ({
      id: `goal-${goal.id}`,
      label: goal.name,
      hint: formatMoney(goal.targetAmount),
      href: `/objetivos?objetivo=${goal.id}`,
      group: 'Objetivos',
    }));
    return [...PAGES, ...accountItems, ...investmentItems, ...goalItems];
  }, [accounts, investments, goals]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return items.slice(0, 12);
    return items
      .filter((item) => `${item.label} ${item.hint} ${item.group}`.toLowerCase().includes(term))
      .slice(0, 12);
  }, [items, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const item of filtered) {
      map.set(item.group, [...(map.get(item.group) ?? []), item]);
    }
    return [...map.entries()];
  }, [filtered]);

  return (
    <>
      <button
        type="button"
        aria-label="Buscar"
        onClick={() => setOpen(true)}
        className="text-text-secondary hover:text-text-primary rounded-md p-1.5 transition-colors hover:bg-white/5"
      >
        <Search className="size-4" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh]">
          <button
            type="button"
            aria-label="Cerrar buscador"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
          />
          <div className="panel-elevated relative mx-4 w-full max-w-md overflow-hidden">
            <div className="border-border-subtle flex items-center gap-2 border-b px-3 py-2.5">
              <Search className="text-text-tertiary size-4 shrink-0" />
              {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar páginas, cuentas, inversiones…"
                className="placeholder:text-text-tertiary w-full bg-transparent text-sm outline-none"
              />
            </div>
            <div className="scrollbar-none max-h-[50vh] overflow-y-auto py-1">
              {grouped.length === 0 && (
                <p className="text-text-secondary px-3 py-6 text-center text-xs">Sin resultados</p>
              )}
              {grouped.map(([group, groupItems]) => (
                <div key={group} className="px-1 py-1">
                  <p className="label-xs px-2 py-1">{group}</p>
                  {groupItems.map((item) => (
                    <a
                      key={item.id}
                      href={item.href}
                      className={cn(
                        'flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-white/5',
                      )}
                    >
                      <span className="truncate">{item.label}</span>
                      <span className="text-text-tertiary num shrink-0 text-xs">{item.hint}</span>
                    </a>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
