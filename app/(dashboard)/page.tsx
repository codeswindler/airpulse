import { prisma } from '@/lib/prisma';
import DashboardChart from '@/components/DashboardChart';
import { 
  TrendingUp, 
  Activity, 
  CreditCard, 
  Users, 
  Zap, 
  ShieldCheck, 
  DollarSign, 
  BarChart3,
  Wallet
} from 'lucide-react';

export default async function Dashboard() {
  const transactions = await prisma.transaction.findMany({ 
    orderBy: { createdAt: 'desc' },
    take: 10 
  });

  // Calculate live metrics
  const totalVolumeRes = await prisma.transaction.aggregate({
    _sum: { amount: true },
    where: { status: 'AIRTIME_DELIVERED' }
  });
  const totalVolume = totalVolumeRes._sum.amount || 0;

  const totalTx = await prisma.transaction.count();

  // Assuming earnings is ~5% comm for demonstration
  const totalEarnings = totalVolume * 0.05;

  // Wallet Reserves
  const walletReservesRes = await prisma.user.aggregate({
    _sum: { walletBalance: true }
  });
  const totalWalletReserve = walletReservesRes._sum.walletBalance || 0;

  // Active Sessions
  const activeSessions = await prisma.ussdSession.count();

  // Aggregate Last 30 Days chart data
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const historicalData = await prisma.transaction.findMany({
    where: { 
      status: 'AIRTIME_DELIVERED',
      createdAt: { gte: thirtyDaysAgo }
    },
    select: { amount: true, createdAt: true },
    orderBy: { createdAt: 'asc' }
  });

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
  
  return (
    <div className="dashboard-scroll">
      <div className="dashboard-header">
        <div>
          <h1>Execution readiness</h1>
          <p>USSD Engine & Airtime healthy</p>
        </div>
        <div className="action-buttons">
          <span className="text-amount">Available to use: Ksh 5,000</span>
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
          
          <table style={{ width: '100%', marginTop: 16, borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
            <thead>
              <tr style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '12px 8px' }}>Date</th>
                <th style={{ padding: '12px 8px' }}>Payer</th>
                <th style={{ padding: '12px 8px' }}>Target</th>
                <th style={{ padding: '12px 8px' }}>Amount</th>
                <th style={{ padding: '12px 8px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '24px 8px', color: 'var(--text-secondary)', textAlign: 'center' }}>No recent transactions</td>
                </tr>
              ) : transactions.map(tx => (
                <tr key={tx.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '12px 8px' }}>{new Date(tx.createdAt).toLocaleString()}</td>
                  <td style={{ padding: '12px 8px' }}>{tx.phoneNumber}</td>
                  <td style={{ padding: '12px 8px' }}>{tx.targetPhone}</td>
                  <td style={{ padding: '12px 8px' }}>Ksh {tx.amount}</td>
                  <td style={{ padding: '12px 8px' }}>
                    <span style={{ 
                      color: tx.status === 'AIRTIME_DELIVERED' ? 'var(--success-color)' : tx.status === 'FAILED' ? 'var(--danger-color)' : 'var(--warning-color)'
                    }}>
                      {tx.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
