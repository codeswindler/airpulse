import { Suspense } from 'react';
import { prisma } from '@/lib/prisma';
import SearchBar from '@/components/SearchBar';
import ExportCSV from '@/components/ExportCSV';

export const dynamic = 'force-dynamic';

export default async function TransactionsPage({ searchParams }: { searchParams: { q?: string } }) {
  const query = searchParams.q || '';
  
  const transactions = await prisma.transaction.findMany({ 
    where: query ? {
      OR: [
        { phoneNumber: { contains: query } },
        { targetPhone: { contains: query } },
        { status: { contains: query } },
        { transactionId: { contains: query } }
      ]
    } : undefined,
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="dashboard-scroll">
      <div className="dashboard-header">
        <div>
          <h1>All Transactions</h1>
          <p>History of all STK and Airtime operations</p>
        </div>
        <div className="action-buttons" style={{ display: 'flex', gap: 16 }}>
          <Suspense fallback={<div className="text-xs text-gray-500">Loading search...</div>}>
            <SearchBar placeholder="Search by phone, id, or status..." />
          </Suspense>
          <ExportCSV data={transactions} filename="transactions-ledger" />
        </div>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
          <thead>
            <tr style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)' }}>
              <th style={{ padding: '16px 8px' }}>Date</th>
              <th style={{ padding: '16px 8px' }}>Transaction ID</th>
              <th style={{ padding: '16px 8px' }}>Payer (Phone)</th>
              <th style={{ padding: '16px 8px' }}>Target (Recipient)</th>
              <th style={{ padding: '16px 8px' }}>Amount</th>
              <th style={{ padding: '16px 8px' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map(tx => (
              <tr key={tx.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '16px 8px' }}>{new Date(tx.createdAt).toLocaleString()}</td>
                <td style={{ padding: '16px 8px', color: 'var(--text-secondary)' }}>{tx.transactionId.substring(0, 12)}...</td>
                <td style={{ padding: '16px 8px' }}>{tx.phoneNumber}</td>
                <td style={{ padding: '16px 8px' }}>{tx.targetPhone}</td>
                <td style={{ padding: '16px 8px', fontWeight: 500 }}>Ksh {tx.amount}</td>
                <td style={{ padding: '16px 8px' }}>
                  <span style={{ 
                    color: tx.status === 'AIRTIME_DELIVERED' ? 'var(--success-color)' : tx.status === 'FAILED' ? 'var(--danger-color)' : 'var(--warning-color)',
                    backgroundColor: 'var(--bg-hover)',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 600
                  }}>
                    {tx.status}
                  </span>
                </td>
              </tr>
            ))}
            {transactions.length === 0 && (
               <tr><td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>No transactions found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
