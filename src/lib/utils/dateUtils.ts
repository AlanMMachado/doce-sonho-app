function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function formatLocalDate(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function getLocalDateKey(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : formatLocalDate(date);
}

function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function addLocalDays(value: string, amount: number): string {
  const date = parseLocalDate(value);
  date.setDate(date.getDate() + amount);
  return formatLocalDate(date);
}

export function getUtcDateRange(startDate: string, endDate: string): { start: string; endExclusive: string } {
  const start = parseLocalDate(startDate);
  const endExclusive = parseLocalDate(endDate);
  endExclusive.setDate(endExclusive.getDate() + 1);

  return {
    start: start.toISOString(),
    endExclusive: endExclusive.toISOString(),
  };
}
