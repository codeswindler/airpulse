import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import DashboardChart from '@/components/DashboardChart';
import GrowthFilterMenu from '@/components/GrowthFilterMenu';
import StatusPill from '@/components/StatusPill';
import SubscriptionCountdown from '@/components/SubscriptionCountdown';
import { resolveAdminContextFromCookies } from '@/lib/adminContext';
import { getMpesaVerificationStatus, getTupayVerificationStatus } from '@/lib/transactionDisplay';
import { getTupayBalance } from '@/lib/airpulseClient';
import {
  calculateEarnings,
  buildChartData,
  buildDateRangeFilter,
  calculateTrend,
  formatKsh,
  type DashboardPeriodWindow,
  resolveDashboardPeriod,
} from '@/lib/dashboardMetrics';
import { checkMpesaConnection } from '@/lib/mpesaClient';
import { checkSmsConnection } from '@/lib/smsClient';
import {
  Activity,
  Building2,
  BarChart3,
  CheckCircle2,
  Gauge,
  ShieldCheck,
  Users,
  CalendarClock,
  TrendingDown,
  TrendingUp,
  Wallet,
  Zap,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

const MPESA_VERIFIED_STATUSES = ['STK_SUCCESS', 'PENDING_AIRTIME', 'AIRTIME_DELIVERED'] as const;

function TrendCopy({
  trend,
  period,
}: {
  trend: ReturnType<typeof calculateTrend>;
  period: DashboardPeriodWindow;
}) {
  const isPositive = trend.isPositive;
  const tone = trend.tone === 'danger' ? 'var(--danger-color)' : trend.tone === 'neutral' ? 'var(--text-secondary)' : 'var(--success-color)';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: tone, fontSize: 13, fontWeight: 600, position: 'relative' }}>
      {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
      <span>{trend.label}</span>
      <GrowthFilterMenu period={period} />
    </div>
  );
}
export default async function Dashboard({
  searchParams,
}: {
  searchParams?: Promise<{ period?: string }>;
}) {
  const { admin, selectedBusinessId } = await resolveAdminContextFromCookies();

  if (admin?.role === 'SUPERADMIN' && !selectedBusinessId) {
    const businesses = await prisma.business.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        admins: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        _count: {
          select: {
            admins: true,
            users: true,
            transactions: true,
          },
        },
      },
    });

    const activeBusinesses = businesses.filter((business) => business.status === 'ACTIVE');
    const suspendedBusinesses = businesses.filter((business) => business.status === 'SUSPENDED');
    const expiringSoonBusinesses = businesses.filter((business) => {
      const effectiveEndsAt = business.subscriptionEndsAt
        ? new Date(business.subscriptionEndsAt)
        : new Date(business.createdAt.getTime() + 30 * 24 * 60 * 60 * 1000);
      const diffMs = effectiveEndsAt.getTime() - Date.now();
      const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      return diffMs > 0 && daysRemaining <= 7;
    });

    return (
      <div className="dashboard-scroll">
        <div className="dashboard-header" style={{ alignItems: 'flex-end', gap: 20 }}>
          <div>
            <h1>Admin Portal</h1>
            <p>Manage tenant accounts, access, and subscription timing.</p>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px', backgroundColor: 'var(--bg-hover)', borderRadius: 999, border: '1px solid var(--border-color)', fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>
            <ShieldCheck size={14} color="var(--success-color)" />
            <span>{businesses.length} accounts managed</span>
          </div>
        </div>

        <div className="grid-top">
          <div className="card">
            <div className="card-title">Managed Accounts</div>
            <div className="card-value">{businesses.length.toLocaleString()}</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>All tenant businesses under the platform.</div>
          </div>
          <div className="card">
            <div className="card-title">Active Accounts</div>
            <div className="card-value">{activeBusinesses.length.toLocaleString()}</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Currently available for live traffic.</div>
          </div>
          <div className="card">
            <div className="card-title">Expiring Soon</div>
            <div className="card-value">{expiringSoonBusinesses.length.toLocaleString()}</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Subscriptions ending within 7 days.</div>
          </div>
        </div>

        <div className="grid-middle">
          <div className="card" style={{ padding: 0 }}>
            <div style={{ padding: '24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <Building2 size={18} color="var(--accent-color)" />
              <div className="card-title" style={{ color: 'var(--text-primary)', marginBottom: 0 }}>Managed Businesses</div>
            </div>
            <div style={{ padding: '24px', display: 'grid', gap: 14 }}>
              {businesses.length === 0 ? (
                <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>No businesses yet. Create the first tenant to get started.</div>
              ) : businesses.map((business) => (
                (() => {
                  const effectiveEndsAt = business.subscriptionEndsAt
                    ? new Date(business.subscriptionEndsAt)
                    : new Date(business.createdAt.getTime() + 30 * 24 * 60 * 60 * 1000);

                  return (
                <div
                  key={business.id}
                  style={{
                    border: '1px solid var(--border-color)',
                    borderRadius: 16,
                    padding: 18,
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.01), rgba(255,255,255,0))',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{business.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        {business.serviceCode || business.slug} • {business.ownerName || business.ownerEmail || 'No owner set'}
                      </div>
                    </div>
                    <StatusPill label={business.status === 'ACTIVE' ? 'Active' : 'Suspended'} tone={business.status === 'ACTIVE' ? 'success' : 'warning'} />
                  </div>

                  <div style={{ marginTop: 14, display: 'grid', gap: 10, fontSize: 13, color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                      <span>Subscription</span>
                      <strong>
                        <SubscriptionCountdown
                          endsAt={effectiveEndsAt}
                          style={{ fontWeight: 700 }}
                        />
                      </strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                      <span>Customers</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{business._count?.users ?? 0}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                      <span>Admins</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{business._count?.admins ?? 0}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                      <span>Transactions</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{business._count?.transactions ?? 0}</strong>
                    </div>
                  </div>
                </div>
                  );
                })()
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-title" style={{ color: 'var(--text-primary)' }}>Portal Notes</div>
            <div style={{ display: 'grid', gap: 14, marginTop: 18, color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <CalendarClock size={16} color="var(--accent-color)" />
                <span>Use the business selector in the top bar to switch from platform view into any tenant’s live dashboard.</span>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <Users size={16} color="var(--accent-color)" />
                <span>Business owners and staff do not see the Businesses portal entry. They only see their tenant workspace.</span>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <ShieldCheck size={16} color="var(--accent-color)" />
                <span>Platform settings stay generic. Tenant credentials and operational data belong under each business account.</span>
              </div>
              <div style={{ marginTop: 8 }}>
                <Link href="/businesses" style={{ color: 'var(--accent-color)', fontWeight: 600, textDecoration: 'none' }}>
                  Open full business management
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!selectedBusinessId) {
    return (
      <div className="dashboard-scroll">
        <div className="card" style={{ marginTop: 24, padding: 24 }}>
          <h1 style={{ marginTop: 0 }}>Select an account</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Choose a business from the top bar to load its operational dashboard.
          </p>
        </div>
      </div>
    );
  }

  const now = new Date();
  const resolvedSearchParams = await searchParams;
  const period = resolveDashboardPeriod(resolvedSearchParams?.period, now);
  const currentDateFilter = buildDateRangeFilter(period.currentStart, period.currentEnd);
  const previousDateFilter = buildDateRangeFilter(period.previousStart, period.previousEnd);
  const currentTransactionWhere = {
    businessId: selectedBusinessId ?? undefined,
    createdAt: currentDateFilter,
  };

  const currentCompletedWhere = {
    businessId: selectedBusinessId ?? undefined,
    status: { in: [...MPESA_VERIFIED_STATUSES] },
    createdAt: currentDateFilter,
  };

  const previousCompletedWhere = {
    businessId: selectedBusinessId ?? undefined,
    status: { in: [...MPESA_VERIFIED_STATUSES] },
    createdAt: previousDateFilter,
  };

  const [
    transactions,
    soldVolumeRes,
    completedCount,
    previousSoldVolumeRes,
    previousCompletedCount,
    historicalData,
    tupayBalance,
    smsHealthy,
    mpesaHealthy,
  ] = await Promise.all([
    prisma.transaction.findMany({
      where: currentTransactionWhere,
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: currentCompletedWhere,
    }),
    prisma.transaction.count({
      where: currentCompletedWhere,
    }),
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: previousCompletedWhere,
    }),
    prisma.transaction.count({
      where: previousCompletedWhere,
    }),
    prisma.transaction.findMany({
      where: currentCompletedWhere,
      select: { amount: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
    getTupayBalance(selectedBusinessId).catch((error) => {
      console.warn('[TUPAY] Balance lookup failed', error);
      return null;
    }),
    checkSmsConnection(selectedBusinessId).catch((error) => {
      console.warn('[SMS] Health probe failed', error);
      return false;
    }),
    checkMpesaConnection(selectedBusinessId).catch((error) => {
      console.warn('[M-PESA] Health probe failed', error);
      return false;
    }),
  ]);

  const soldVolume = soldVolumeRes._sum.amount || 0;
  const previousSoldVolume = previousSoldVolumeRes._sum.amount || 0;
  const earnings = calculateEarnings(soldVolume);
  const previousEarnings = calculateEarnings(previousSoldVolume);

  const volumeTrend = calculateTrend(soldVolume, previousSoldVolume);
  const completedTrend = calculateTrend(completedCount, previousCompletedCount);
  const earningsTrend = calculateTrend(earnings, previousEarnings);
  const chartData = buildChartData(historicalData, period.bucket);

  const tupayBalanceLabel = tupayBalance
    ? `Ksh ${formatKsh(tupayBalance.amount, true)}`
    : 'not yet synced';
  const systemServices = [
    { label: 'Tupay API', live: Boolean(tupayBalance) },
    { label: 'SMS API', live: smsHealthy },
    { label: 'M-Pesa API', live: mpesaHealthy },
  ];
  const liveCount = systemServices.filter((service) => service.live).length;
  const systemHealthTone = liveCount === systemServices.length ? 'success' : liveCount === 0 ? 'danger' : 'warning';
  const systemHealthHeadline = liveCount === systemServices.length ? 'All services live' : `${liveCount}/${systemServices.length} live`;

  return (
    <div className="dashboard-scroll">
      <div className="dashboard-header" style={{ alignItems: 'flex-end', gap: 20 }}>
        <div>
          <h1>Airtime Operations</h1>
          <p>Live sales, completed orders, and provider health</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
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
        </div>
      </div>

      <div className="grid-top">
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="card-title">Airtime Sold</div>
              <div className="card-value" style={{ textShadow: '0 0 20px var(--accent-glow)' }}>
                Ksh {formatKsh(soldVolume, true)}
              </div>
            </div>
            <div style={{ padding: '8px', background: 'var(--bg-hover)', borderRadius: '12px' }}>
              <BarChart3 size={20} color="var(--accent-color)" />
            </div>
          </div>
          <TrendCopy trend={volumeTrend} period={period} />
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="card-title">Orders Completed</div>
              <div className="card-value">{completedCount.toLocaleString()}</div>
            </div>
            <div style={{ padding: '8px', background: 'var(--bg-hover)', borderRadius: '12px' }}>
              <CheckCircle2 size={20} color="var(--success-color)" />
            </div>
          </div>
          <TrendCopy trend={completedTrend} period={period} />
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="card-title">Earnings</div>
              <div className="card-value">Ksh {formatKsh(earnings, true)}</div>
            </div>
            <div style={{ padding: '8px', background: 'var(--bg-hover)', borderRadius: '12px' }}>
              <TrendingUp size={20} color="var(--success-color)" />
            </div>
          </div>
          <TrendCopy trend={earningsTrend} period={period} />
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
              <Gauge size={16} color="var(--accent-color)" />
              <div className="card-title" style={{ fontSize: 11, letterSpacing: 0.5, marginBottom: 0 }}>SYSTEM HEALTH</div>
            </div>
            <StatusPill label={systemHealthHeadline} tone={systemHealthTone} />
          </div>

          <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: -0.8, marginBottom: 10 }}>
            {systemHealthHeadline}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Live/offline probes for Tupay, SMS, and M-Pesa connections.
          </div>

          <div style={{ marginTop: 22, paddingTop: 16, borderTop: '1px solid var(--border-color)', display: 'grid', gap: 12 }}>
            {systemServices.map((service) => (
              <div key={service.label} style={{ fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{service.label}</span>
                <StatusPill label={service.live ? 'Live' : 'Offline'} tone={service.live ? 'success' : 'danger'} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid-bottom" style={{ gridTemplateColumns: '1fr' }}>
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-title" style={{ color: 'var(--text-primary)' }}>Airtime Sold ({period.label})</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{period.comparisonLabel}</div>
          <div style={{ marginTop: 16 }}>
            <DashboardChart data={chartData} />
          </div>
        </div>

        <div className="card">
          <div className="card-title" style={{ color: 'var(--text-primary)' }}>Recent Airtime Transactions</div>
          <div style={{ overflowX: 'auto', marginTop: 16 }}>
            <table className="responsive-table" style={{ minWidth: 900 }}>
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
                    <td colSpan={6} data-no-label="true" style={{ padding: '24px 8px', color: 'var(--text-secondary)', textAlign: 'center' }}>
                      No recent transactions in this period
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => {
                    const mpesaStatus = getMpesaVerificationStatus(tx);
                    const tupayStatus = getTupayVerificationStatus(tx);

                    return (
                      <tr key={tx.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td data-label="Date" style={{ padding: '12px 8px' }}>{new Date(tx.createdAt).toLocaleString()}</td>
                        <td data-label="Payer" style={{ padding: '12px 8px' }}>{tx.phoneNumber}</td>
                        <td data-label="Target" style={{ padding: '12px 8px' }}>{tx.targetPhone}</td>
                        <td data-label="Amount" style={{ padding: '12px 8px' }}>Ksh {formatKsh(tx.amount)}</td>
                        <td data-label="M-Pesa" style={{ padding: '12px 8px' }}>
                          <StatusPill label={mpesaStatus.label} tone={mpesaStatus.tone} />
                        </td>
                        <td data-label="Tupay" style={{ padding: '12px 8px' }}>
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
