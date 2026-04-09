import { prisma } from '@/lib/prisma';
import DashboardChart from '@/components/DashboardChart';
import StatusPill from '@/components/StatusPill';
import { getMpesaVerificationStatus, getTupayVerificationStatus } from '@/lib/transactionDisplay';
import { getTupayBalance } from '@/lib/airpulseClient';
import {
  TrendingUp,
  Activity,
  Zap,
  ShieldCheck,
  DollarSign,
  BarChart3,
  Wallet,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [transactions, totalVolumeRes, totalTx, walletReservesRes, activeSessions, historicalData, tupayBalance] = await Promise.all([
    prisma.transaction.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { status: 'AIRTIME_DELIVERED' }
    }),
    prisma.transaction.count(),
    prisma.user.aggregate({
      _sum: { walletBalance: true }
    }),
    prisma.ussdSession.count(),
    prisma.transaction.findMany({
      where: {
        status: 'AIRTIME_DELIVERED',
        createdAt: { gte: thirtyDaysAgo }
      },
      select: { amount: true, createdAt: true },
      orderBy: { createdAt: 'asc' }
    }),
    getTupayBalance().catch((error) => {
      console.warn('[TUPAY] Balance lookup failed', error);
      return null;
    }),
  ]);

  const totalVolume = totalVolumeRes._sum.amount || 0;
  const totalEarnings = totalVolume * 0.05;
  const totalWalletReserve = walletReservesRes._sum.walletBalance || 0;

  // Group by date string 'MM-DD'
  const groupedData: Record<string, number> = {};
  historicalData.forEach(tx => {
    const dateStr = tx.createdAt.toISOString().slice(5, 10);
    groupedData[dateStr] = (groupedData[dateStr] || 0) + tx.amount;
  });

  const chartData = Object.keys(groupedData).map(date => ({
    date,
    amount: groupedData[date]
  }));

  const tupayBalanceLabel = tupayBalance
    ? `${tupayBalance.currency === 'KES' ? 'Ksh' : tupayBalance.currency} ${tupayBalance.amount.toLocaleString('en-KE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
    : 'not yet synced';

  return (
    <div className="dashboard-scroll">
      <div className="dashboard-header">
        <div>
          <h1>Execution readiness</h1>
          <p>USSD Engine & Airtime healthy</p>
        </div>
        <div className="action-buttons">
          <span className="text-amount">Tupay balance: {tupayBalanceLabel}</span>
          <button className="btn-primary">Add funds</button>
        </div>
      </div>

      <div className="grid-top">
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="card-title">Volume</div>
              <div className="card-value" style={{ textShadow: '0 0 20px var(--accent-glow)' }}>
                Ksh {totalVolume.toLocaleString()}
              </div>
            </div>
            <div style={{ padding: '8px', background: 'var(--bg-hover)', borderRadius: '12px' }}>
              <BarChart3 size={20} color="var(--accent-color)" />
            </div>
          </div>
          <div className="trend-up">
            <TrendingUp size={14} /> 
            <span>24% than last month</span>
          </div>
        </div>
        
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="card-title">Transactions</div>
              <div className="card-value">{totalTx}</div>
            </div>
            <div style={{ padding: '8px', background: 'var(--bg-hover)', borderRadius: '12px' }}>
              <Activity size={20} color="var(--success-color)" />
            </div>
          </div>
          <div className="trend-up">
            <TrendingUp size={14} /> 
            <span>12% growth</span>
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="card-title">Earnings (Comm.)</div>
              <div className="card-value">Ksh {totalEarnings.toLocaleString()}</div>
            </div>
            <div style={{ padding: '8px', background: 'var(--bg-hover)', borderRadius: '12px' }}>
              <DollarSign size={20} color="var(--warning-color)" />
            </div>
          </div>
          <div className="trend-up">
            <TrendingUp size={14} /> 
            <span>5% growth</span>
          </div>
        </div>
      </div>

      <div className="grid-middle">
        <div className="card" style={{ padding: '0' }}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <ShieldCheck size={16} color="var(--success-color)" />
            <div className="card-title" style={{ fontSize: 11, letterSpacing: 0.5, marginBottom: 0 }}>SYSTEM HEALTH</div>
          </div>
          <div style={{ fontSize: 13, color: 'var(--success-color)', fontWeight: 600 }}>All services operational</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, marginBottom: 24 }}>Latency: 45ms (Optimal)</div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Wallet size={16} color="var(--accent-color)" />
            <div className="card-title" style={{ fontSize: 11, letterSpacing: 0.5, marginBottom: 0 }}>WALLET METRICS</div>
          </div>
          <div style={{ fontSize: 13, display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ color: 'var(--text-secondary)' }}>Reserved Balance</span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>Ksh {totalWalletReserve.toLocaleString()}</span>
          </div>
          <div style={{ fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Live Sessions</span>
            <span style={{ color: 'var(--success-color)', fontWeight: 700 }}>{activeSessions} active</span>
          </div>
        </div>
      </div>

      <div className="grid-bottom" style={{ gridTemplateColumns: '1fr' }}>
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-title" style={{ color: 'var(--text-primary)' }}>Performance (Last 30 Days)</div>
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
                    <td colSpan={6} style={{ padding: '24px 8px', color: 'var(--text-secondary)', textAlign: 'center' }}>No recent transactions</td>
                  </tr>
                ) : transactions.map(tx => {
                  const mpesaStatus = getMpesaVerificationStatus(tx);
                  const tupayStatus = getTupayVerificationStatus(tx);

                  return (
                    <tr key={tx.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '12px 8px' }}>{new Date(tx.createdAt).toLocaleString()}</td>
                      <td style={{ padding: '12px 8px' }}>{tx.phoneNumber}</td>
                      <td style={{ padding: '12px 8px' }}>{tx.targetPhone}</td>
                      <td style={{ padding: '12px 8px' }}>Ksh {tx.amount}</td>
                      <td style={{ padding: '12px 8px' }}>
                        <StatusPill label={mpesaStatus.label} tone={mpesaStatus.tone} />
                      </td>
                      <td style={{ padding: '12px 8px' }}>
                        <StatusPill label={tupayStatus.label} tone={tupayStatus.tone} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  );
}
