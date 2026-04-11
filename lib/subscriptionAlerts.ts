import { prisma } from './prisma';
import { sendEmail } from './emailClient';
import { sendSms } from './smsClient';

type AlertChannel = 'email' | 'sms';
type AlertKind = 'expiring_soon' | 'expired';

const notificationState = {
  running: false,
  started: false,
};

function getBucket(daysRemaining: number) {
  if (daysRemaining <= 0) {
    return 'expired' as const;
  }

  if (daysRemaining <= 1) {
    return '1d' as const;
  }

  if (daysRemaining <= 3) {
    return '3d' as const;
  }

  if (daysRemaining <= 7) {
    return '7d' as const;
  }

  return null;
}

function formatDate(value: Date) {
  return value.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function buildMessage(businessName: string, subscriptionEndsAt: Date, bucket: string) {
  const readableDate = formatDate(subscriptionEndsAt);

  if (bucket === 'expired') {
    return {
      subject: `${businessName} subscription expired`,
      text: `AirPulse: ${businessName} subscription expired on ${readableDate}. Service is paused until renewal.`,
    };
  }

  return {
    subject: `${businessName} subscription expiring soon`,
    text: `AirPulse: ${businessName} subscription expires on ${readableDate}. Renewal is due within ${bucket.replace('d', '')} days.`,
  };
}

async function logNotification(params: {
  businessId?: string | null;
  kind: AlertKind;
  channel: AlertChannel;
  recipient: string;
  subject: string;
  message: string;
  status: 'SENT' | 'SKIPPED' | 'FAILED';
  metadata?: Record<string, unknown>;
  dedupeKey: string;
}) {
  try {
    await prisma.notificationLog.create({
      data: {
        businessId: params.businessId ?? null,
        kind: params.kind,
        channel: params.channel,
        recipient: params.recipient,
        subject: params.subject,
        message: params.message,
        status: params.status,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
        dedupeKey: params.dedupeKey,
      },
    });
  } catch (error) {
    // Duplicate logs are expected when a reminder has already been sent.
    if (!(error instanceof Error) || !error.message.toLowerCase().includes('unique')) {
      console.warn('[SUBSCRIPTIONS] Failed to log notification', error);
    }
  }
}

async function sendBusinessAlert(params: {
  businessId: string;
  businessName: string;
  ownerEmail: string | null;
  ownerPhone: string | null;
  subscriptionEndsAt: Date;
  bucket: string;
}) {
  const { subject, text } = buildMessage(params.businessName, params.subscriptionEndsAt, params.bucket);
  const html = `<p>${text}</p>`;
  const dedupePrefix = `subscription:${params.businessId}:${params.subscriptionEndsAt.toISOString().slice(0, 10)}:${params.bucket}`;

  if (params.ownerEmail) {
    let emailStatus: 'SENT' | 'SKIPPED' | 'FAILED' = 'SKIPPED';

    try {
      const emailResult = await sendEmail({
        to: params.ownerEmail,
        subject,
        text,
        html,
      });

      emailStatus = emailResult ? 'SENT' : 'SKIPPED';
    } catch (error) {
      emailStatus = 'FAILED';
      console.warn('[SUBSCRIPTIONS] Email reminder failed', error);
    }

    await logNotification({
      businessId: params.businessId,
      kind: params.bucket === 'expired' ? 'expired' : 'expiring_soon',
      channel: 'email',
      recipient: params.ownerEmail,
      subject,
      message: text,
      status: emailStatus,
      dedupeKey: `${dedupePrefix}:email`,
      metadata: {
        bucket: params.bucket,
      },
    });
  }

  if (params.ownerPhone) {
    let smsStatus: 'SENT' | 'SKIPPED' | 'FAILED' = 'SKIPPED';

    try {
      const smsResult = await sendSms(params.ownerPhone, text);
      smsStatus = smsResult ? 'SENT' : 'SKIPPED';
    } catch (error) {
      smsStatus = 'FAILED';
      console.warn('[SUBSCRIPTIONS] SMS reminder failed', error);
    }

    await logNotification({
      businessId: params.businessId,
      kind: params.bucket === 'expired' ? 'expired' : 'expiring_soon',
      channel: 'sms',
      recipient: params.ownerPhone,
      subject,
      message: text,
      status: smsStatus,
      dedupeKey: `${dedupePrefix}:sms`,
      metadata: {
        bucket: params.bucket,
      },
    });
  }
}

export async function runSubscriptionAlertSweep() {
  if (notificationState.running) {
    return;
  }

  notificationState.running = true;

  try {
    const businesses = await prisma.business.findMany({
      where: {
        subscriptionEndsAt: {
          not: null,
        },
        status: 'ACTIVE',
      },
      include: {
        admins: {
          select: {
            email: true,
            phoneNumber: true,
            role: true,
            name: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    for (const business of businesses) {
      const endsAt = business.subscriptionEndsAt;

      if (!endsAt) {
        continue;
      }

      const daysRemaining = Math.ceil((endsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      const bucket = getBucket(daysRemaining);

      if (!bucket) {
        continue;
      }

      const ownerAdmin = business.admins.find((admin) => admin.role === 'BUSINESS_OWNER') ?? business.admins[0] ?? null;

      await sendBusinessAlert({
        businessId: business.id,
        businessName: business.name,
        ownerEmail: business.ownerEmail || ownerAdmin?.email || null,
        ownerPhone: business.ownerPhone || ownerAdmin?.phoneNumber || null,
        subscriptionEndsAt: endsAt,
        bucket,
      });
    }
  } catch (error) {
    console.error('[SUBSCRIPTIONS] Reminder sweep failed', error);
  } finally {
    notificationState.running = false;
  }
}

export function startSubscriptionAlertScheduler() {
  if (notificationState.started) {
    return;
  }

  notificationState.started = true;

  void runSubscriptionAlertSweep();

  const intervalMs = 60 * 60 * 1000;
  setInterval(() => {
    void runSubscriptionAlertSweep();
  }, intervalMs);
}
