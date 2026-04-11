import { Suspense } from 'react';
import { prisma } from '@/lib/prisma';
import SearchBar from '@/components/SearchBar';
import ExportCSV from '@/components/ExportCSV';
import StatusPill from '@/components/StatusPill';
import { resolveAdminContextFromCookies } from '@/lib/adminContext';
import { getMpesaVerificationStatus, getTupayVerificationStatus } from '@/lib/transactionDisplay';

export const dynamic = 'force-dynamic';

export default async function TransactionsPage({ searchParams }: { searchParams: { q?: string } }) {
  const { selectedBusinessId } = await resolveAdminContextFromCookies();
  const query = searchParams.q || '';
  
  const transactions = await prisma.transaction.findMany({ 
    where: {
      businessId: selectedBusinessId ?? undefined,
      ...(query ? {
      OR: [
        { phoneNumber: { contains: query } },
        { targetPhone: { contains: query } },
        { status: { contains: query } },
        { transactionId: { contains: query } }
      ]
    } : {}),
    },
    orderBy: { createdAt: 'desc' }
  });

  const exportRows = transactions.map((tx) => {
    const mpesaStatus = getMpesaVerificationStatus(tx);
    const tupayStatus = getTupayVerificationStatus(tx);

    return {
      date: new Date(tx.createdAt).toLocaleString(),
      transaction_id: tx.transactionId,
      payer_phone: tx.phoneNumber,
      target_phone: tx.targetPhone,
      amount: tx.amount,
      mpesa_verification: mpesaStatus.label,
      tupay_verification: tupayStatus.label,
    };
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
          <ExportCSV data={exportRows} filename="transactions-ledger" />
        </div>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="responsive-table" style={{ minWidth: 980 }}>
            <thead>
              <tr style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '16px 8px' }}>Date</th>
                <th style={{ padding: '16px 8px' }}>Transaction ID</th>
                <th style={{ padding: '16px 8px' }}>Payer (Phone)</th>
                <th style={{ padding: '16px 8px' }}>Target (Recipient)</th>
                <th style={{ padding: '16px 8px' }}>Amount</th>
                <th style={{ padding: '16px 8px' }}>M-Pesa</th>
                <th style={{ padding: '16px 8px' }}>Tupay</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(tx => {
                const mpesaStatus = getMpesaVerificationStatus(tx);
                const tupayStatus = getTupayVerificationStatus(tx);

                return (
                  <tr key={tx.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td data-label="Date" style={{ padding: '16px 8px' }}>{new Date(tx.createdAt).toLocaleString()}</td>
                    <td data-label="Transaction ID" style={{ padding: '16px 8px', color: 'var(--text-secondary)' }}>{tx.transactionId.substring(0, 12)}...</td>
                    <td data-label="Payer (Phone)" style={{ padding: '16px 8px' }}>{tx.phoneNumber}</td>
                    <td data-label="Target (Recipient)" style={{ padding: '16px 8px' }}>{tx.targetPhone}</td>
                    <td data-label="Amount" style={{ padding: '16px 8px', fontWeight: 500 }}>Ksh {tx.amount}</td>
                    <td data-label="M-Pesa" style={{ padding: '16px 8px' }}>
                      <StatusPill label={mpesaStatus.label} tone={mpesaStatus.tone} />
                    </td>
                    <td data-label="Tupay" style={{ padding: '16px 8px' }}>
                      <StatusPill label={tupayStatus.label} tone={tupayStatus.tone} />
                    </td>
                  </tr>
                );
              })}
              {transactions.length === 0 && (
                <tr><td colSpan={7} data-no-label="true" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>No transactions found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
