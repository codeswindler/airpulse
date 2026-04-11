'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TopUpButton({ phoneNumber, businessId }: { phoneNumber: string; businessId?: string | null }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleTopUp = async () => {
    const amount = window.prompt(`Enter amount to top up Ksh for ${phoneNumber}:`);
    if (!amount) return;

    setLoading(true);
    try {
      const res = await fetch('/api/admin/wallet-topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, amount: parseFloat(amount), businessId })
      });

      if (res.ok) {
        alert('Top-Up Successful!');
        router.refresh();
      } else {
        const err = await res.json();
        alert(`Error: ${err.error}`);
      }
    } catch (e) {
      alert('Network Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={handleTopUp} 
      className="btn-primary" 
      style={{ padding: '6px 12px', fontSize: '12px' }}
      disabled={loading}
    >
      {loading ? 'Processing...' : 'Perform TopUp'}
    </button>
  );
}
