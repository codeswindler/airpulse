import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import DashboardChart from '@/components/DashboardChart';
import StatusPill from '@/components/StatusPill';
import { getMpesaVerificationStatus, getTupayVerificationStatus } from '@/lib/transactionDisplay';
import { getTupayBalance } from '@/lib/airpulseClient';
import {
  buildChartData,
  buildDateRangeFilter,
  calculateAirtimeRunway,
  calculateTrend,
  COMMISSION_RATE,
  DASHBOARD_PERIOD_OPTIONS,
  formatKsh,
  resolveDashboardPeriod,
} from '@/lib/dashboardMetrics';
import {
  Activity,
  BarChart3,
  DollarSign,
  TrendingDown,
  TrendingUp,
  Wallet,
  Zap,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

const SETTLED_STATUSES = ['STK_SUCCESS', 'PENDING_AIRTIME', 'AIRTIME_DELIVERED'] as const;
const ACTIVE_SESSION_WINDOW_MINUTES = 15;

function getPeriodHref(periodKey: string) {
  return periodKey === '30d' ? '/' : `/?period=${encodeURIComponent(periodKey)}`;
}

function renderTrendText(label: string, comparisonLabel: string) {
  if (label === 'New period' || label === 'No prior data') {
    return label;
  }

  return `${label} ${comparisonLabel}`;
}

function TrendCopy({
  trend,
  comparisonLabel,
}: {
  trend: ReturnType<typeof calculateTrend>;
  comparisonLabel: string;
}) {
  const isPositive = trend.isPositive;
  const tone = trend.tone === 'danger' ? 'var(--danger-color)' : trend.tone === 'neutral' ? 'var(--text-secondary)' : 'var(--success-color)';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: tone, fontSize: 13, fontWeight: 600 }}>
      {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
      <span>{renderTrendText(trend.label, comparisonLabel)}</span>
    </div>
  );
}
export default async function Dashboard({
  searchParams,
}: {
  searchParams?: { period?: string };
}) {
  const now = new Date();
  const period = resolveDashboardPeriod(searchParams?.period, now);
  const currentDateFilter = buildDateRangeFilter(period.currentStart, period.currentEnd);
  const previousDateFilter = buildDateRangeFilter(period.previousStart, period.previousEnd);

  const currentSettledWhere = {
    status: { in: [...SETTLED_STATUSES] },
    createdAt: currentDateFilter,
  };

  const previousSettledWhere = {
    status: { in: [...SETTLED_STATUSES] },
    createdAt: previousDateFilter,
  };

  const currentTransactionWhere = {
    createdAt: currentDateFilter,
  };

  const previousTransactionWhere = {
    createdAt: previousDateFilter,
  };

  const [
    transactions,
    totalVolumeRes,
    totalTx,
    settledTxCount,
    previousTx,
    previousVolumeRes,
    historicalData,
    tupayBalance,
  ] = await Promise.all([
    prisma.transaction.findMany({
      where: currentTransactionWhere,
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: currentSettledWhere,
    }),
    prisma.transaction.count({
      where: currentTransactionWhere,
    }),
    prisma.transaction.count({
      where: currentSettledWhere,
    }),
    prisma.transaction.count({
      where: previousTransactionWhere,
    }),
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: previousSettledWhere,
    }),
    prisma.transaction.findMany({
      where: currentSettledWhere,
      select: { amount: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
    getTupayBalance().catch((error) => {
      console.warn('[TUPAY] Balance lookup failed', error);
      return null;
    }),
  ]);

  const totalVolume = totalVolumeRes._sum.amount || 0;
  const previousVolume = previousVolumeRes._sum.amount || 0;
  const totalEarnings = totalVolume * COMMISSION_RATE;
  const previousEarnings = previousVolume * COMMISSION_RATE;
  const airtimeRunway = calculateAirtimeRunway(
    tupayBalance?.amount ?? null,
    totalVolume,
    settledTxCount,
  );

  const volumeTrend = calculateTrend(totalVolume, previousVolume);
  const transactionsTrend = calculateTrend(totalTx, previousTx);
  const earningsTrend = calculateTrend(totalEarnings, previousEarnings);
  const chartData = buildChartData(historicalData, period.bucket);

  const tupayBalanceLabel = tupayBalance
    ? `Ksh ${formatKsh(tupayBalance.amount, true)}`
    : 'not yet synced';

  return (
    <div className="dashboard-scroll">
      <div className="dashboard-header" style={{ alignItems: 'flex-end', gap: 20 }}>
        <div>
          <h1>Execution readiness</h1>
          <p>USSD Engine & Airtime healthy</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 12px',
              backgroundColor: 'var(--bg-hover)',
              borderRadius: 999,
              border: '1px solid var(--border-color)',
              fontSize: 13,
              color: 'var(--text-primary)',
              fontWeight: 600,
            }}
          >
            <Wallet size={14} color="var(--accent-color)" />
            <span>Tupay balance</span>
            <span style={{ color: 'var(--text-secondary)' }}>-</span>
            <strong>{tupayBalanceLabel}</strong>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {DASHBOARD_PERIOD_OPTIONS.map((option) => {
              const isActive = option.key === period.key;

              return (
                <Link
                  key={option.key}
                  href={getPeriodHref(option.key)}
                  style={{
                    textDecoration: 'none',
                    padding: '6px 12px',
                    borderRadius: 999,
                    border: `1px solid ${isActive ? 'var(--accent-color)' : 'var(--border-color)'}`,
                    backgroundColor: isActive ? 'rgba(59, 130, 246, 0.18)' : 'var(--bg-hover)',
                    color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: 0.2,
                  }}
                >
                  {option.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid-top">
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="card-title">Volume</div>
              <div className="card-value" style={{ textShadow: '0 0 20px var(--accent-glow)' }}>
                Ksh {formatKsh(totalVolume)}
              </div>
            </div>
            <div style={{ padding: '8px', background: 'var(--bg-hover)', borderRadius: '12px' }}>
              <BarChart3 size={20} color="var(--accent-color)" />
            </div>
          </div>
          <TrendCopy trend={volumeTrend} comparisonLabel={period.comparisonLabel} />
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="card-title">Transactions</div>
              <div className="card-value">{totalTx.toLocaleString()}</div>
            </div>
            <div style={{ padding: '8px', background: 'var(--bg-hover)', borderRadius: '12px' }}>
              <Activity size={20} color="var(--success-color)" />
            </div>
          </div>
          <TrendCopy trend={transactionsTrend} comparisonLabel={period.comparisonLabel} />
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="card-title">Earnings (Comm. @ 5%)</div>
              <div className="card-value">Ksh {formatKsh(totalEarnings, true)}</div>
            </div>
            <div style={{ padding: '8px', background: 'var(--bg-hover)', borderRadius: '12px' }}>
              <DollarSign size={20} color="var(--warning-color)" />
            </div>
          </div>
          <TrendCopy trend={earningsTrend} comparisonLabel={period.comparisonLabel} />
        </div>
      </div>

      <div className="grid-middle">
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <Zap size={18} color="var(--accent-color)" />
            <div className="card-title" style={{ color: 'var(--text-primary)', marginBottom: 0 }}>Today's Activity</div>
          </div>
          <div style={{ padding: '24px', color: 'var(--text-secondary)', fontSize: 13, height: 150, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ opacity: 0.5, marginBottom: 12 }}>
              <Activity size={48} strokeWidth={1} />
            </div>
            No recent activity tracked
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Wallet size={16} color="var(--accent-color)" />
              <div className="card-title" style={{ fontSize: 11, letterSpacing: 0.5, marginBottom: 0 }}>AIRTIME RUNWAY</div>
            </div>
            <StatusPill label={airtimeRunway.statusLabel} tone={airtimeRunway.tone} />
          </div>

          <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: -0.8, marginBottom: 10 }}>
            {airtimeRunway.headline}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {airtimeRunway.detail}
          </div>

          <div style={{ marginTop: 22, paddingTop: 16, borderTop: '1px solid var(--border-color)', display: 'grid', gap: 12 }}>
            <div style={{ fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Tupay balance</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
                {tupayBalance ? `Ksh ${formatKsh(tupayBalance.amount, true)}` : 'Not synced'}
              </span>
            </div>
            <div style={{ fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Settled orders</span>
              <span style={{ color: 'var(--success-color)', fontWeight: 700 }}>{settledTxCount.toLocaleString()} orders</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid-bottom" style={{ gridTemplateColumns: '1fr' }}>
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-title" style={{ color: 'var(--text-primary)' }}>Performance ({period.label})</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{period.comparisonLabel}</div>
          <div style={{ marginTop: 16 }}>
            <DashboardChart data={chartData} />
          </div>
        </div>

        <div className="card">
          <div className="card-title" style={{ color: 'var(--text-primary)' }}>Recent Airtime Transactions</div>
          <div style={{ overflowX: 'auto', marginTop: 16 }}>
            <table style={{ width: '100%', minWidth: 900, borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
              <thead>
                <tr style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '12px 8px' }}>Date</th>
                  <th style={{ padding: '12px 8px' }}>Payer</th>
                  <th style={{ padding: '12px 8px' }}>Target</th>
                  <th style={{ padding: '12px 8px' }}>Amount</th>
                  <th style={{ padding: '12px 8px' }}>M-Pesa</th>
                  <th style={{ padding: '12px 8px' }}>Tupay</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '24px 8px', color: 'var(--text-secondary)', textAlign: 'center' }}>
                      No recent transactions in this period
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => {
                    const mpesaStatus = getMpesaVerificationStatus(tx);
                    const tupayStatus = getTupayVerificationStatus(tx);

                    return (
                      <tr key={tx.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '12px 8px' }}>{new Date(tx.createdAt).toLocaleString()}</td>
                        <td style={{ padding: '12px 8px' }}>{tx.phoneNumber}</td>
                        <td style={{ padding: '12px 8px' }}>{tx.targetPhone}</td>
                        <td style={{ padding: '12px 8px' }}>Ksh {formatKsh(tx.amount)}</td>
                        <td style={{ padding: '12px 8px' }}>
                          <StatusPill label={mpesaStatus.label} tone={mpesaStatus.tone} />
                        </td>
                        <td style={{ padding: '12px 8px' }}>
                          <StatusPill label={tupayStatus.label} tone={tupayStatus.tone} />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
