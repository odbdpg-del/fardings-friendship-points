export function nowIso(): string {
  return new Date().toISOString();
}

export function getWeekStart(date = new Date()): string {
  const start = new Date(date);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  start.setHours(0, 0, 0, 0);
  return start.toISOString().slice(0, 10);
}

export function getDayStart(date = new Date()): string {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start.toISOString().slice(0, 10);
}

export function secondsBetween(startMs: number, endMs: number): number {
  return Math.max(0, Math.floor((endMs - startMs) / 1000));
}
