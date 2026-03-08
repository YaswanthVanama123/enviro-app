// ─── Helper: format Date → 'YYYY-MM-DD' (no timezone shift) ──────────────────
export function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ─── Date range calculators (mirrors webapp Home.tsx exactly) ─────────────────
export function getWeekRange(): {startDate: string; endDate: string; groupBy: string} {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - daysToMonday);
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  return {
    startDate: formatDate(startOfWeek),
    endDate: formatDate(endOfWeek),
    groupBy: 'day',
  };
}

export function getMonthRange(): {startDate: string; endDate: string; groupBy: string} {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  return {
    startDate: formatDate(startOfMonth),
    endDate: formatDate(endOfMonth),
    groupBy: 'week',
  };
}

export function getYearRange(): {startDate: string; endDate: string; groupBy: string} {
  const today = new Date();
  const startOfYear = new Date(today.getFullYear(), 0, 1);
  const endOfYear = new Date(today.getFullYear(), 11, 31);
  return {
    startDate: formatDate(startOfYear),
    endDate: formatDate(endOfYear),
    groupBy: 'month',
  };
}
