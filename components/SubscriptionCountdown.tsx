'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { getSubscriptionCountdownState } from '@/lib/subscriptionCountdown';

type Props = {
  endsAt: Date | string | null | undefined;
  className?: string;
  style?: CSSProperties;
};

export default function SubscriptionCountdown({ endsAt, className, style }: Props) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const { label, expired, hasValue } = useMemo(
    () => getSubscriptionCountdownState(endsAt, nowMs),
    [endsAt, nowMs]
  );

  const color = !hasValue
    ? 'var(--text-secondary)'
    : expired
      ? 'var(--danger-color)'
      : 'var(--success-color)';

  return (
    <span
      aria-live="polite"
      className={className}
      style={{
        color,
        fontVariantNumeric: 'tabular-nums',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {label}
    </span>
  );
}
