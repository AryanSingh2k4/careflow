const CLINIC_TIME_ZONE = 'Asia/Kolkata';

/** UTC bounds for a calendar day in India: inclusive start, exclusive next day. */
export function istDayBounds(date: string): { start: string; endExclusive: string } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Date must use YYYY-MM-DD.');
  const start = new Date(`${date}T00:00:00+05:30`);
  if (!Number.isFinite(start.getTime()) || start.toLocaleDateString('en-CA', { timeZone: CLINIC_TIME_ZONE }) !== date) {
    throw new Error('Date is invalid.');
  }
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start: start.toISOString(), endExclusive: end.toISOString() };
}

export function formatIstDateTime(value: Date | string): { date: string; time: string } {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error('Invalid appointment date.');
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: CLINIC_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const get = (type: string) => parts.find(part => part.type === type)?.value ?? '';
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    time: date.toLocaleTimeString('en-US', { timeZone: CLINIC_TIME_ZONE, hour: '2-digit', minute: '2-digit' }),
  };
}
