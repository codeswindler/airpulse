export type DashboardPeriodKey = 'today' | '7d' | '30d' | '90d';
export type DashboardBucket = 'hour' | 'day';

export const DASHBOARD_PERIOD_OPTIONS: Array<{
  key: DashboardPeriodKey;
  label: string;
}> = [
  { key: 'today', label: 'Today' },
  { key: '7d', label: '7D' },
  { key: '30d', label: '30D' },
  { key: '90d', label: '90D' },
];

export type DashboardPeriodWindow = {
  key: DashboardPeriodKey;
  label: string;
  comparisonLabel: string;
  bucket: DashboardBucket;
  currentStart: Date;
  currentEnd: Date;
  previousStart: Date;
  previousEnd: Date;
};

type MetricRow = {
  amount: number;
  createdAt: Date;
};

type TrendTone = 'success' | 'danger' | 'neutral';

const NAIROBI_TIME_ZONE = 'Africa/Nairobi';
const NAIROBI_OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export const EARNING_RATE = 0.06;

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function toNairobiDate(date: Date) {
  return new Date(date.getTime() + NAIROBI_OFFSET_MS);
}

function getNairobiCalendarParts(date: Date) {
  const zoned = toNairobiDate(date);

  return {
    year: zoned.getUTCFullYear(),
    month: zoned.getUTCMonth() + 1,
    day: zoned.getUTCDate(),
    hour: zoned.getUTCHours(),
    minute: zoned.getUTCMinutes(),
    second: zoned.getUTCSeconds(),
  };
}

function startOfNairobiDay(date: Date) {
  const parts = getNairobiCalendarParts(date);
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day) - NAIROBI_OFFSET_MS);
}

export function resolveDashboardPeriod(period: string | undefined, now = new Date()): DashboardPeriodWindow {
  const key: DashboardPeriodKey = period === 'today' || period === '7d' || period === '90d' ? period : '30d';
  const currentEnd = new Date(now);
  const bucket: DashboardBucket = key === 'today' ? 'hour' : 'day';
  let currentStart: Date;
  let previousStart: Date;
  let previousEnd: Date;

  if (key === 'today') {
    currentStart = startOfNairobiDay(currentEnd);
    const periodMs = currentEnd.getTime() - currentStart.getTime();
    previousStart = new Date(currentStart.getTime() - periodMs);
    previousEnd = new Date(currentStart.getTime());
  } else {
    const days = key === '7d' ? 7 : key === '90d' ? 90 : 30;
    const durationMs = days * DAY_MS;
    currentStart = new Date(currentEnd.getTime() - durationMs);
    previousStart = new Date(currentStart.getTime() - durationMs);
    previousEnd = new Date(currentStart.getTime());
  }

  const labelMap: Record<DashboardPeriodKey, string> = {
    today: 'Today',
    '7d': 'Last 7 Days',
    '30d': 'Last 30 Days',
    '90d': 'Last 90 Days',
  };

  const compareLabelMap: Record<DashboardPeriodKey, string> = {
    today: 'vs the same time yesterday',
    '7d': 'vs previous 7 days',
    '30d': 'vs previous 30 days',
    '90d': 'vs previous 90 days',
  };

  return {
    key,
    label: labelMap[key],
    comparisonLabel: compareLabelMap[key],
    bucket,
    currentStart,
    currentEnd,
    previousStart,
    previousEnd,
  };
}

export function buildDateRangeFilter(start: Date, end: Date) {
  return {
    gte: start,
    lt: end,
  };
}

export function formatKsh(amount: number, forceDecimals = false) {
  return amount.toLocaleString('en-KE', {
    minimumFractionDigits: forceDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  });
}

export function calculateTrend(current: number, previous: number): {
  label: string;
  tone: TrendTone;
  isPositive: boolean;
} {
  if (previous <= 0) {
    if (current <= 0) {
      return {
        label: '0%',
        tone: 'neutral',
        isPositive: true,
      };
    }

    return {
      label: '+100%',
      tone: 'success',
      isPositive: true,
    };
  }

  const change = ((current - previous) / previous) * 100;
  const isPositive = change >= 0;

  return {
    label: `${isPositive ? '+' : '-'}${Math.abs(change).toFixed(0)}%`,
    tone: isPositive ? 'success' : 'danger',
    isPositive,
  };
}

export function calculateEarnings(volume: number, rate = EARNING_RATE) {
  return volume * rate;
}

export function buildChartData(rows: MetricRow[], bucket: DashboardBucket) {
  const grouped = new Map<string, { date: string; amount: number; sortKey: number }>();

  for (const row of rows) {
    const date = new Date(row.createdAt);
    const zoned = toNairobiDate(date);
    const year = zoned.getUTCFullYear();
    const month = zoned.getUTCMonth() + 1;
    const day = zoned.getUTCDate();
    const hour = zoned.getUTCHours();
    const sortKey = bucket === 'hour'
      ? Date.UTC(year, month - 1, day, hour)
      : Date.UTC(year, month - 1, day);
    const key = bucket === 'hour'
      ? `${year}-${pad(month)}-${pad(day)}T${pad(hour)}`
      : `${year}-${pad(month)}-${pad(day)}`;
    const label = bucket === 'hour'
      ? `${pad(hour)}:00`
      : new Intl.DateTimeFormat('en-KE', {
          month: 'short',
          day: 'numeric',
          timeZone: NAIROBI_TIME_ZONE,
        }).format(date);

    const existing = grouped.get(key);
    if (existing) {
      existing.amount += row.amount;
    } else {
      grouped.set(key, {
        date: label,
        amount: row.amount,
        sortKey,
      });
    }
  }

  return Array.from(grouped.values())
    .sort((a, b) => a.sortKey - b.sortKey)
    .map(({ date, amount }) => ({ date, amount }));
}
