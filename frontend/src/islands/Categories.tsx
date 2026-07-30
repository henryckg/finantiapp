import { useMemo, useState } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Utensils,
  Car,
  Home,
  HeartPulse,
  GraduationCap,
  Gamepad2,
  Shirt,
  Cpu,
  PlugZap,
  CreditCard,
  CircleDashed,
  Briefcase,
  Laptop,
  TrendingUp,
  Gift,
  type LucideIcon,
} from 'lucide-react';
import { useAppData } from '../hooks/useAppData';
import { useDataStore } from '../store/data';
import { CATEGORY_TYPE_LABELS, type Category, type CategoryType } from '../types';
import { Badge, EmptyState, Panel, Spinner } from '../components/ui/Primitives';
import { Button } from '../components/ui/Button';
import { FieldRow, Input, Select } from '../components/ui/Field';
import { Sheet } from '../components/ui/Sheet';
import { cn } from '../lib/utils';

const COLORS = ['#5E6AD2', '#4CC38A', '#F0654A', '#E5A050', '#4A9CF0', '#C061CB'];

const ICON_OPTIONS: Array<{ name: string; Icon: LucideIcon }> = [
  { name: 'utensils', Icon: Utensils },
  { name: 'car', Icon: Car },
  { name: 'home', Icon: Home },
  { name: 'heart-pulse', Icon: HeartPulse },
  { name: 'graduation-cap', Icon: GraduationCap },
  { name: 'gamepad-2', Icon: Gamepad2 },
  { name: 'shirt', Icon: Shirt },
  { name: 'cpu', Icon: Cpu },
  { name: 'plug-zap', Icon: PlugZap },
  { name: 'credit-card', Icon: CreditCard },
  { name: 'briefcase', Icon: Briefcase },
  { name: 'laptop', Icon: Laptop },
  { name: 'trending-up', Icon: TrendingUp },
  { name: 'gift', Icon: Gift },
  { name: 'circle-dashed', Icon: CircleDashed },
];

const ICON_BY_NAME = Object.fromEntries(ICON_OPTIONS.map((item) => [item.name, item.Icon])) as Record<
  string,
  LucideIcon
>;

export default function Categories() {
  const { ready, categories, transactions, scheduledExpenses } = useAppData();
  const createCategory = useDataStore((state) => state.createCategory);
  const updateCategory = useDataStore((state) => state.updateCategory);
  const deleteCategory = useDataStore((state) => state.deleteCategory);

  const [filter, setFilter] = useState<'all' | CategoryType>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Category | undefined>();
  const [name, setName] = useState('');
  const [type, setType] = useState<CategoryType>('expense');
  const [color, setColor] = useState(COLORS[0]!);
  const [icon, setIcon] = useState('circle-dashed');
  const [error, setError] = useState<string | null>(null);

  const usageCount = useMemo(() => {
    const txCounts: Record<string, number> = {};
    for (const tx of transactions) {
      if (tx.categoryId) txCounts[tx.categoryId] = (txCounts[tx.categoryId] ?? 0) + 1;
    }
    for (const sch of scheduledExpenses) {
      if (sch.categoryId) txCounts[sch.categoryId] = (txCounts[sch.categoryId] ?? 0) + 1;
    }
    return txCounts;
  }, [transactions, scheduledExpenses]);

  const filtered = useMemo(() => {
    const sorted = [...categories].sort((a, b) => a.name.localeCompare(b.name));
    if (filter === 'all') return sorted;
    return sorted.filter((c) => c.type === filter || c.type === 'both');
  }, [categories, filter]);

  const counts = useMemo(() => {
    const byType: Record<CategoryType, number> = { expense: 0, income: 0, both: 0 };
    for (const c of categories) byType[c.type] += 1;
    return byType;
  }, [categories]);

  const openCreate = () => {
    setEditing(undefined);
    setName('');
    setType('expense');
    setColor(COLORS[0]!);
    setIcon('circle-dashed');
    setError(null);
    setFormOpen(true);
  };

  const openEdit = (category: Category) => {
    setEditing(category);
    setName(category.name);
    setType(category.type);
    setColor(category.color ?? COLORS[0]!);
    setIcon(category.icon ?? 'circle-dashed');
    setError(null);
    setFormOpen(true);
  };

  const submit = async () => {
    if (!name.trim()) {
      setError('El nombre es obligatorio');
      return;
    }
    const payload = {
      name: name.trim(),
      type,
      color,
      icon,
      isDefault: editing?.isDefault ?? false,
    };
    if (editing) {
      await updateCategory(editing.id, payload);
    } else {
      await createCategory(payload);
    }
    setFormOpen(false);
  };

  if (!ready) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="size-6" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Panel
        title="Categorías"
        action={
          <Button size="sm" variant="primary" onClick={openCreate}>
            <Plus className="size-3.5" />
            Agregar
          </Button>
        }
      >
        <div className="flex flex-wrap gap-1.5 px-4 pt-3">
          {([
            { value: 'all' as const, label: `Todas (${categories.length})` },
            { value: 'expense' as const, label: `Gastos (${counts.expense})` },
            { value: 'income' as const, label: `Ingresos (${counts.income})` },
            { value: 'both' as const, label: `Ambos (${counts.both})` },
          ]).map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFilter(option.value)}
              className={cn(
                'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                filter === option.value
                  ? 'border-accent/40 bg-accent/15 text-accent'
                  : 'border-border-subtle text-text-secondary hover:text-text-primary',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            title="Sin categorías"
            description="Crea tu primera categoría para clasificar tus movimientos."
            action={
              <Button size="sm" variant="primary" onClick={openCreate}>
                <Plus className="size-3.5" />
                Agregar categoría
              </Button>
            }
          />
        ) : (
          <ul className="divide-border-subtle/70 divide-y">
            {filtered.map((category) => {
              const Icon = ICON_BY_NAME[category.icon ?? ''] ?? CircleDashed;
              const used = usageCount[category.id] ?? 0;
              return (
                <li key={category.id} className="row-hover flex items-center gap-3 px-4 py-3">
                  <span
                    className="flex size-7 shrink-0 items-center justify-center rounded-md"
                    style={{ backgroundColor: `${category.color ?? '#5E6AD2'}22` }}
                  >
                    <Icon
                      className="size-3.5"
                      style={{ color: category.color ?? '#5E6AD2' }}
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{category.name}</span>
                    <span className="text-text-tertiary flex items-center gap-1.5 text-xs">
                      <Badge tone={category.type === 'income' ? 'positive' : 'neutral'}>
                        {CATEGORY_TYPE_LABELS[category.type]}
                      </Badge>
                      {used > 0 && <span>{used} uso{used === 1 ? '' : 's'}</span>}
                    </span>
                  </span>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      aria-label="Editar categoría"
                      onClick={() => openEdit(category)}
                      className="text-text-tertiary hover:text-text-primary rounded p-1 transition-colors hover:bg-white/5"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label="Eliminar categoría"
                      onClick={() => {
                        const msg =
                          used > 0
                            ? `La categoría "${category.name}" se usa en ${used} movimiento(s). Al eliminarla, esos movimientos quedarán sin categoría. ¿Eliminar de todos modos?`
                            : `¿Eliminar la categoría "${category.name}"?`;
                        if (confirm(msg)) {
                          void deleteCategory(category.id);
                        }
                      }}
                      className="text-text-tertiary hover:text-negative rounded p-1 transition-colors hover:bg-white/5"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <Sheet
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Editar categoría' : 'Nueva categoría'}
        description="Las categorías te ayudan a clasificar ingresos y gastos."
        footer={
          <>
            <Button variant="ghost" onClick={() => setFormOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={() => void submit()}>
              {editing ? 'Guardar' : 'Crear categoría'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3.5">
          <FieldRow label="Nombre" error={error ?? undefined}>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Supermercado"
            />
          </FieldRow>

          <FieldRow label="Tipo">
            <Select value={type} onChange={(event) => setType(event.target.value as CategoryType)}>
              {Object.entries(CATEGORY_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </FieldRow>

          <FieldRow label="Color">
            <div className="flex flex-wrap gap-2">
              {COLORS.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-label={`Color ${option}`}
                  onClick={() => setColor(option)}
                  className={cn(
                    'size-7 rounded-md border transition-transform',
                    color === option
                      ? 'border-text-primary ring-2 ring-white/20'
                      : 'border-transparent hover:scale-105',
                  )}
                  style={{ backgroundColor: option }}
                />
              ))}
            </div>
          </FieldRow>

          <FieldRow label="Ícono">
            <div className="grid grid-cols-8 gap-1.5">
              {ICON_OPTIONS.map(({ name: iconName, Icon }) => (
                <button
                  key={iconName}
                  type="button"
                  aria-label={iconName}
                  onClick={() => setIcon(iconName)}
                  className={cn(
                    'flex size-8 items-center justify-center rounded-md border transition-colors',
                    icon === iconName
                      ? 'border-accent/50 bg-accent/15 text-accent'
                      : 'border-border-subtle text-text-secondary hover:text-text-primary hover:bg-white/5',
                  )}
                >
                  <Icon className="size-4" />
                </button>
              ))}
            </div>
          </FieldRow>
        </div>
      </Sheet>
    </div>
  );
}
