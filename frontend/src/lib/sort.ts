import type { Account, Goal, GoalAllocation, Investment, Transaction } from '../types';

/**
 * Comparador determinístico y estable para registros.
 *
 * El problema: al hacer refresh, la app pinta primero desde el caché
 * IndexedDB (orden por primary key = UUID aleatorio) y un par de segundos
 * después reemplaza con datos del backend (orden por campo real). Sin un
 * desempate total, los registros que comparten la clave primaria de orden
 * (p. ej. transacciones del mismo día) se reordenan entre sí tras el sync,
 * produciendo el "parpadeo" visible.
 *
 * Estos helpers fijan un orden idéntico sin importar la procedencia de los
 * datos, desempatando por createdAt y finalmente por id (siempre único).
 */

function compareDesc(a: number, b: number): number {
  return b - a;
}

function compareAsc(a: number, b: number): number {
  return a - b;
}

function tiebreakById(a: { id: string }, b: { id: string }): number {
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * Ordena transacciones de la más reciente a la más antigua.
 * Desempata por createdAt (más nuevo primero) y luego por id.
 * No muta el arreglo original.
 */
export function sortTransactions(input: Transaction[]): Transaction[] {
  return [...input].sort((a, b) => {
    if (a.date !== b.date) return compareDesc(a.date, b.date);
    if (a.createdAt !== b.createdAt) return compareDesc(a.createdAt, b.createdAt);
    return tiebreakById(a, b);
  });
}

/**
 * Ordena cuentas por createdAt ascendente (más antigua primero),
 * igual que el backend (ORDER BY created_at). Desempata por id.
 * No muta el arreglo original.
 */
export function sortAccounts(input: Account[]): Account[] {
  return [...input].sort((a, b) => {
    if (a.createdAt !== b.createdAt) return compareAsc(a.createdAt, b.createdAt);
    return tiebreakById(a, b);
  });
}

/**
 * Ordena inversiones por nombre ascendente, igual que el backend
 * (ORDER BY name). Desempata por id. Importante para los gráficos de
 * distribución (pie): el color de cada slice se asigna por índice, así
 * que un orden no determinístico hace que los colores se reordenen y el
 * gráfico se re-anime tras el sync con el backend.
 * No muta el arreglo original.
 */
export function sortInvestments(input: Investment[]): Investment[] {
  return [...input].sort((a, b) => {
    if (a.name !== b.name) return a.name < b.name ? -1 : 1;
    return tiebreakById(a, b);
  });
}

/**
 * Ordena objetivos por createdAt descendente (más nuevo primero),
 * igual que el backend (ORDER BY created_at DESC). Desempata por id.
 * No muta el arreglo original.
 */
export function sortGoals(input: Goal[]): Goal[] {
  return [...input].sort((a, b) => {
    if (a.createdAt !== b.createdAt) return compareDesc(a.createdAt, b.createdAt);
    return tiebreakById(a, b);
  });
}

/**
 * Ordena asignaciones de objetivos por createdAt ascendente,
 * igual que el backend (ORDER BY a.created_at). Desempata por id.
 * No muta el arreglo original.
 */
export function sortGoalAllocations(input: GoalAllocation[]): GoalAllocation[] {
  return [...input].sort((a, b) => {
    if (a.createdAt !== b.createdAt) return compareAsc(a.createdAt, b.createdAt);
    return tiebreakById(a, b);
  });
}
