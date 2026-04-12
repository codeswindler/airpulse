'use client';

import { useState, useEffect } from 'react';
import { MessageSquareText } from 'lucide-react';

type Props = {
  businessId?: string | null;
  compact?: boolean;
};

export default function SmsBalanceBadge({ businessId, compact = false }: Props) {
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
      gap: compact ? 6 : 8, 
      padding: compact ? '4px 10px' : '6px 12px', 
      backgroundColor: 'var(--bg-hover)', 
      borderRadius: compact ? 10 : 8,
      fontSize: compact ? 12 : 13,
      color: 'var(--text-primary)',
      fontWeight: 600,
      minWidth: 0,
      width: compact ? 'fit-content' : 'auto',
      maxWidth: compact ? '100%' : 'none',
      justifyContent: 'flex-start',
    }}>
        <MessageSquareText size={compact ? 13 : 14} color="var(--accent-color)" />
       <span style={{
         whiteSpace: 'nowrap',
         overflow: 'hidden',
         textOverflow: 'ellipsis',
       }}>{balance.toLocaleString()} Units</span>
    </div>
  );
}
