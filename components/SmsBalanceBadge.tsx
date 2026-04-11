'use client';

import { useState, useEffect } from 'react';
import { MessageSquareText } from 'lucide-react';

type Props = {
  businessId?: string | null;
};

export default function SmsBalanceBadge({ businessId }: Props) {
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const url = businessId
          ? `/api/admin/sms-balance?businessId=${encodeURIComponent(businessId)}`
          : '/api/admin/sms-balance';
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) {
          setBalance(null);
          return;
        }
        const data = await res.json();
        setBalance(typeof data.balance === 'number' ? data.balance : null);
      } catch (err) {
        setBalance(null);
        console.error('Failed to fetch SMS balance');
      }
    };

    const handleSettingsUpdated = () => {
      void fetchBalance();
    };

    fetchBalance();
    window.addEventListener('settings-updated', handleSettingsUpdated);
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchBalance, 5 * 60 * 1000);
    return () => {
      clearInterval(interval);
      window.removeEventListener('settings-updated', handleSettingsUpdated);
    };
  }, [businessId]);

  if (balance === null) return null;

  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: 8, 
      padding: '6px 12px', 
      backgroundColor: 'var(--bg-hover)', 
      borderRadius: 8,
      fontSize: 13,
      color: 'var(--text-primary)',
      fontWeight: 600
    }}>
        <MessageSquareText size={14} color="var(--accent-color)" />
       <span>{balance.toLocaleString()} Units</span>
    </div>
  );
}
