import { format } from 'date-fns';
type Movement = { dueDate: string };

export function groupByMonth<T extends Movement>(items: T[]) {
  const out: Record<string, T[]> = {};
  for (const it of items) {
    const k = format(new Date(it.dueDate), "MMMM 'de' yyyy");
    (out[k] ??= []).push(it);
  }
  return out;
}