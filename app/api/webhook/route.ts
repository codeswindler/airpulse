import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { isTupayPendingStatus, isTupaySuccessStatus } from '@/lib/airpulseClient';

function buildProviderReference(...parts: Array<string | null | undefined>) {
  const values = new Set<string>();

  for (const part of parts) {
    if (!part) {
      continue;
    }

    for (const item of part.split('|')) {
      const trimmed = item.trim();
      if (trimmed) {
        values.add(trimmed);
      }
    }
  }

  return Array.from(values).join('|');
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signatureHeader = req.headers.get('x-webhook-signature');
    const secret = process.env.AIRPULSE_SIGNING_SECRET;

    if (secret && signatureHeader && signatureHeader.startsWith('sha256=')) {
      const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
      const received = signatureHeader.slice(7);
      
      try {
        if (!crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(received, 'hex'))) {
          return new Response('Invalid signature', { status: 403 });
        }
      } catch (e) {
        return new Response('Invalid signature format', { status: 403 });
      }
    }

    const payload = JSON.parse(rawBody);
    const tupayId = typeof payload.id === 'string' ? payload.id.trim() : '';
    const reference = typeof payload.reference === 'string' ? payload.reference.trim() : '';
    const lookupConditions = [];

    if (reference) {
      lookupConditions.push({ transactionId: reference });
    }

    if (tupayId) {
      lookupConditions.push({ providerReference: { contains: `tupay:${tupayId}` } });
    }

    if (lookupConditions.length === 0) {
      console.warn('[TUPAY] Callback missing transaction reference', {
        status: payload.status,
      });

      return new Response('OK', { status: 200 });
    }

    const tx = await prisma.transaction.findFirst({
      where: {
        OR: lookupConditions,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!tx) {
      console.warn('[TUPAY] Callback transaction not found', {
        reference: reference || 'missing',
        id: tupayId || 'missing',
        status: payload.status,
      });

      return new Response('OK', { status: 200 });
    }

    const providerReference = buildProviderReference(
      tx.providerReference,
      tupayId ? `tupay:${tupayId}` : null,
    );

    if (isTupaySuccessStatus(payload.status)) {
      if (tx.status === 'AIRTIME_DELIVERED') {
        return new Response('OK', { status: 200 });
      }

      await prisma.transaction.update({
        where: { id: tx.id },
        data: {
          providerReference,
          status: 'AIRTIME_DELIVERED',
        }
      });
    } else if (isTupayPendingStatus(payload.status)) {
      if (tx.status === 'AIRTIME_DELIVERED') {
        return new Response('OK', { status: 200 });
      }

      await prisma.transaction.update({
        where: { id: tx.id },
        data: {
          providerReference,
          status: 'PENDING_AIRTIME',
        }
      });
    } else {
      if (tx.status === 'FAILED') {
        return new Response('OK', { status: 200 });
      }

      await prisma.transaction.update({
        where: { id: tx.id },
        data: {
          providerReference,
          status: 'FAILED',
        }
      });

      if (tx.providerReference?.startsWith('wallet')) {
        await prisma.user.update({
          where: { phoneNumber: tx.phoneNumber },
          data: { walletBalance: { increment: tx.amount } }
        });
      }
    }

    return new Response('OK', { status: 200 });
  } catch (err: any) {
    console.error('Webhook Error:', err);
    return new Response('Internal Error', { status: 500 });
  }
}
