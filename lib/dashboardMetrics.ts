import type { StatusTone } from '@/lib/transactionDisplay';

export type DashboardPeriodKey = 'today' | '7d' | '30d' | '90d';
export type DashboardBucket = 'hour' | 'day';

export const COMMISSION_RATE = 0.05;

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

export type AirtimeRunwaySnapshot = {
  headline: string;
  detail: string;
  statusLabel: string;
  tone: StatusTone;
  averageOrderAmount: number | null;
  runwayOrders: number | null;
};

export function resolveDashboardPeriod(period: string | undefined, now = new Date()): DashboardPeriodWindow {
  const key: DashboardPeriodKey = period === 'today' || period === '7d' || period === '90d' ? period : '30d';
  const currentEnd = new Date(now);
  const currentStart = new Date(now);
  const bucket: DashboardBucket = key === 'today' ? 'hour' : 'day';

  if (key === 'today') {
    currentStart.setHours(0, 0, 0, 0);
  } else if (key === '7d') {
    currentStart.setDate(currentStart.getDate() - 7);
  } else if (key === '90d') {
    currentStart.setDate(currentStart.getDate() - 90);
  } else {
    currentStart.setDate(currentStart.getDate() - 30);
  }

  const periodMs = currentEnd.getTime() - currentStart.getTime();
  const previousStart = new Date(currentStart);
  const previousEnd = new Date(currentStart);

  if (key === 'today') {
    const previousDayStart = new Date(currentStart);
    previousDayStart.setDate(previousDayStart.getDate() - 1);

    previousStart.setTime(previousDayStart.getTime());
    previousEnd.setTime(previousDayStart.getTime() + periodMs);
  } else {
    previousStart.setTime(currentStart.getTime() - periodMs);
    previousEnd.setTime(currentStart.getTime());
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
        label: 'No prior data',
        tone: 'neutral',
        isPositive: true,
      };
    }

    return {
      label: 'New period',
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

export function calculateAirtimeRunway(
  balanceAmount: number | null,
  settledVolume: number,
  settledCount: number,
): AirtimeRunwaySnapshot {
  if (balanceAmount === null) {
    return {
      headline: 'Not synced',
      detail: 'Waiting for a live Tupay balance response.',
      statusLabel: 'Offline',
      tone: 'neutral',
      averageOrderAmount: null,
      runwayOrders: null,
    };
  }

  if (settledCount <= 0 || settledVolume <= 0) {
    return {
      headline: `Ksh ${formatKsh(balanceAmount, true)}`,
      detail: 'Need more settled airtime orders to estimate runway.',
      statusLabel: 'Estimating',
      tone: 'info',
      averageOrderAmount: null,
      runwayOrders: null,
    };
  }

  const averageOrderAmount = settledVolume / settledCount;
  const runwayOrders = balanceAmount / averageOrderAmount;

  let statusLabel: string;
  let tone: StatusTone;

  if (runwayOrders >= 100) {
    statusLabel = 'Healthy';
    tone = 'success';
  } else if (runwayOrders >= 25) {
    statusLabel = 'Comfortable';
    tone = 'info';
  } else if (runwayOrders >= 10) {
    statusLabel = 'Watch';
    tone = 'warning';
  } else {
    statusLabel = 'Critical';
    tone = 'danger';
  }

  return {
    headline: `${Math.floor(runwayOrders).toLocaleString()} orders left`,
    detail: `Avg order Ksh ${formatKsh(averageOrderAmount, true)} | Balance Ksh ${formatKsh(balanceAmount, true)}`,
    statusLabel,
    tone,
    averageOrderAmount,
    runwayOrders,
  };
}

export function buildChartData(rows: MetricRow[], bucket: DashboardBucket) {
  const grouped = new Map<string, { date: string; amount: number; sortKey: number }>();

  for (const row of rows) {
    const date = new Date(row.createdAt);
    const sortKey = bucket === 'hour'
      ? new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()).getTime()
      : new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    const key = bucket === 'hour'
      ? `${date.toISOString().slice(0, 13)}`
      : `${date.toISOString().slice(0, 10)}`;
    const label = bucket === 'hour'
      ? `${String(date.getHours()).padStart(2, '0')}:00`
      : date.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' });

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
