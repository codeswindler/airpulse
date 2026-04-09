export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export type StatusBadge = {
  label: string;
  tone: StatusTone;
};

type TransactionSnapshot = {
  providerReference?: string | null;
  status: string;
};

function hasFlag(providerReference: string | null | undefined, flag: string) {
  return providerReference
    ?.split('|')
    .map((item) => item.trim())
    .some((item) => item === flag || item.startsWith(flag)) ?? false;
}

function hasMpesaReference(tx: TransactionSnapshot) {
  return hasFlag(tx.providerReference, 'mpesa:') || hasFlag(tx.providerReference, 'mpesa-merchant:');
}

function hasTupayReference(tx: TransactionSnapshot) {
  return hasFlag(tx.providerReference, 'tupay:');
}

function isWalletFlow(tx: TransactionSnapshot) {
  return hasFlag(tx.providerReference, 'wallet');
}

export function getMpesaVerificationStatus(tx: TransactionSnapshot): StatusBadge {
  if (isWalletFlow(tx)) {
    return { label: 'Skipped', tone: 'neutral' };
  }

  if (tx.status === 'PENDING_STK') {
    return { label: 'Pending', tone: 'warning' };
  }

  if (tx.status === 'FAILED') {
    return hasMpesaReference(tx)
      ? { label: 'Failed', tone: 'danger' }
      : { label: 'Not sent', tone: 'neutral' };
  }

  if (tx.status === 'STK_SUCCESS' || tx.status === 'PENDING_AIRTIME' || tx.status === 'AIRTIME_DELIVERED') {
    return { label: 'Verified', tone: 'success' };
  }

  return hasMpesaReference(tx)
    ? { label: 'Verified', tone: 'success' }
    : { label: 'Pending', tone: 'warning' };
}

export function getTupayVerificationStatus(tx: TransactionSnapshot): StatusBadge {
  if (tx.status === 'PENDING_STK') {
    return { label: 'Not sent', tone: 'neutral' };
  }

  if (tx.status === 'FAILED') {
    return hasTupayReference(tx)
      ? { label: 'Failed', tone: 'danger' }
      : { label: 'Not sent', tone: 'neutral' };
  }

  if (tx.status === 'STK_SUCCESS') {
    return { label: 'Queued', tone: 'info' };
  }

  if (tx.status === 'PENDING_AIRTIME') {
    return { label: 'Pending', tone: 'warning' };
  }

  if (tx.status === 'AIRTIME_DELIVERED') {
    return { label: 'Verified', tone: 'success' };
  }

  return hasTupayReference(tx)
    ? { label: 'Pending', tone: 'warning' }
    : { label: 'Not sent', tone: 'neutral' };
}

export function getOverallTransactionStatus(tx: TransactionSnapshot): StatusBadge {
  switch (tx.status) {
    case 'AIRTIME_DELIVERED':
      return { label: 'Delivered', tone: 'success' };
    case 'PENDING_AIRTIME':
    case 'PENDING_STK':
      return { label: 'Pending', tone: 'warning' };
    case 'STK_SUCCESS':
      return { label: 'In Progress', tone: 'info' };
    case 'FAILED':
      return { label: 'Failed', tone: 'danger' };
    default:
      return { label: tx.status, tone: 'neutral' };
  }
}
