import { Suspense } from 'react';
import { prisma } from '@/lib/prisma';
import SearchBar from '@/components/SearchBar';
import ExportCSV from '@/components/ExportCSV';
import TopUpButton from '@/components/TopUpButton';
import { resolveAdminContextFromCookies } from '@/lib/adminContext';

export const dynamic = 'force-dynamic';

export default async function CustomersWalletsPage({ searchParams }: { searchParams: { q?: string } }) {
  const { selectedBusinessId } = await resolveAdminContextFromCookies();
  const query = searchParams.q || '';
  
  const users = await prisma.user.findMany({ 
    where: {
      businessId: selectedBusinessId ?? undefined,
      ...(query ? {
        OR: [
          { phoneNumber: { contains: query } },
          { id: { contains: query } }
        ]
      } : {}),
    },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="dashboard-scroll">
      <div className="dashboard-header">
        <div>
          <h1>Customers & Wallets</h1>
          <p>Manage USSD users and their accumulated fallback balances</p>
        </div>
        <div className="action-buttons" style={{ display: 'flex', gap: 16 }}>
          <Suspense fallback={<div className="text-xs text-gray-500">Loading search...</div>}>
            <SearchBar placeholder="Search by phone or id..." />
          </Suspense>
          <ExportCSV data={users} filename="customers-wallets" />
        </div>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <table className="responsive-table">
          <thead>
            <tr style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)' }}>
              <th style={{ padding: '16px 8px' }}>User Context ID</th>
              <th style={{ padding: '16px 8px' }}>Phone Number</th>
              <th style={{ padding: '16px 8px' }}>Wallet Balance</th>
              <th style={{ padding: '16px 8px' }}>Joined Date</th>
              <th style={{ padding: '16px 8px', textAlign: 'right' }}>Admin Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td data-label="User Context ID" style={{ padding: '16px 8px', color: 'var(--text-secondary)' }}>{u.id.substring(0, 8)}</td>
                <td data-label="Phone Number" style={{ padding: '16px 8px', fontWeight: 600 }}>{u.phoneNumber}</td>
                <td data-label="Wallet Balance" style={{ padding: '16px 8px' }}>
                  <span style={{ 
                    color: u.walletBalance > 0 ? 'var(--success-color)' : 'var(--text-secondary)',
                    fontWeight: u.walletBalance > 0 ? 600 : 400
                  }}>
                    Ksh {u.walletBalance.toLocaleString()}
                  </span>
                </td>
                <td data-label="Joined Date" style={{ padding: '16px 8px' }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                <td data-label="Admin Actions" style={{ padding: '16px 8px', textAlign: 'right' }}>
                   <TopUpButton phoneNumber={u.phoneNumber} businessId={selectedBusinessId} />
                </td>
              </tr>
            ))}
            {users.length === 0 && (
               <tr><td colSpan={5} data-no-label="true" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>No customers found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
