import type { Account, Transaction } from '../types';

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
