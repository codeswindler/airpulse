type SubscriptionEndsAt = Date | string | null | undefined;

const DAY_MS = 24 * 60 * 60 * 1000;

function pad(value: number) {
  return String(value).padStart(2, '0');
}

export type SubscriptionCountdownState = {
  label: string;
  expired: boolean;
  hasValue: boolean;
  remainingMs: number | null;
};

export function getSubscriptionCountdownState(
  subscriptionEndsAt: SubscriptionEndsAt,
  nowMs = Date.now()
): SubscriptionCountdownState {
  if (!subscriptionEndsAt) {
    return {
      label: 'No subscription set',
      expired: false,
      hasValue: false,
      remainingMs: null,
    };
  }

  const endsAt = new Date(subscriptionEndsAt);
  const endsAtMs = endsAt.getTime();

  if (Number.isNaN(endsAtMs)) {
    return {
      label: 'Invalid expiry',
      expired: false,
      hasValue: false,
      remainingMs: null,
    };
  }

  const remainingMs = Math.max(0, endsAtMs - nowMs);

  if (remainingMs === 0) {
    return {
      label: 'Expired',
      expired: true,
      hasValue: true,
      remainingMs: 0,
    };
  }

  const totalSeconds = Math.floor(remainingMs / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return {
      label: `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s left`,
      expired: false,
      hasValue: true,
      remainingMs,
    };
  }

  if (hours > 0) {
    return {
      label: `${hours}h ${pad(minutes)}m ${pad(seconds)}s left`,
      expired: false,
      hasValue: true,
      remainingMs,
    };
  }

  if (minutes > 0) {
    return {
      label: `${minutes}m ${pad(seconds)}s left`,
      expired: false,
      hasValue: true,
      remainingMs,
    };
  }

  return {
    label: `${seconds}s left`,
    expired: false,
    hasValue: true,
    remainingMs,
  };
}

export function formatSubscriptionCountdown(subscriptionEndsAt: SubscriptionEndsAt, nowMs = Date.now()) {
  return getSubscriptionCountdownState(subscriptionEndsAt, nowMs).label;
}

export function isSubscriptionExpired(subscriptionEndsAt: SubscriptionEndsAt, nowMs = Date.now()) {
  return getSubscriptionCountdownState(subscriptionEndsAt, nowMs).expired;
}
