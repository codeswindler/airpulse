'use client';

import { useState, useEffect } from 'react';
import { Mail } from 'lucide-react';

export default function SmsBalanceBadge() {
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const res = await fetch('/api/admin/sms-balance');
        const data = await res.json();
        setBalance(data.balance);
      } catch (err) {
        console.error('Failed to fetch SMS balance');
      }
    };
    fetchBalance();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchBalance, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

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
       <Mail size={14} color="var(--accent-color)" />
       <span>{balance.toLocaleString()} Units</span>
    </div>
  );
}
