import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { buyAirtimeFromBalance, isTupayPendingStatus, isTupaySuccessStatus } from '@/lib/airpulseClient';
import { parseMpesaCallback } from '@/lib/mpesaClient';

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
    const payload = await req.json();
    const callback = parseMpesaCallback(payload);
    const lookupConditions = [];

    if (callback.checkoutRequestId) {
      lookupConditions.push({ providerReference: { contains: `mpesa:${callback.checkoutRequestId}` } });
    }

    if (callback.merchantRequestId) {
      lookupConditions.push({ providerReference: { contains: `mpesa-merchant:${callback.merchantRequestId}` } });
    }

    console.log('[M-PESA] Callback received', {
      checkoutRequestId: callback.checkoutRequestId || 'missing',
      merchantRequestId: callback.merchantRequestId || 'missing',
      resultCode: callback.resultCode,
      resultDesc: callback.resultDesc,
    });

    if (lookupConditions.length === 0) {
      console.warn('[M-PESA] Callback missing lookup identifiers');
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    const transaction = await prisma.transaction.findFirst({
      where: {
        OR: lookupConditions,
      },
    });

    if (!transaction) {
      console.warn('[M-PESA] Callback transaction not found', {
        checkoutRequestId: callback.checkoutRequestId || 'missing',
        merchantRequestId: callback.merchantRequestId || 'missing',
      });

      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    if (callback.resultCode !== 0) {
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: 'FAILED' },
      });

      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    if (transaction.status !== 'PENDING_STK') {
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: 'STK_SUCCESS',
      },
    });

    const airtimeRes = await buyAirtimeFromBalance(transaction.targetPhone, transaction.amount, transaction.transactionId);
    const providerReference = buildProviderReference(
      transaction.providerReference,
      airtimeRes?.id ? `tupay:${airtimeRes.id}` : null,
    );

    if (isTupaySuccessStatus(airtimeRes?.status)) {
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          providerReference,
          status: 'AIRTIME_DELIVERED',
        },
      });
    } else if (isTupayPendingStatus(airtimeRes?.status)) {
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          providerReference,
          status: 'PENDING_AIRTIME',
        },
      });
    } else {
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          providerReference,
          status: 'FAILED',
        },
      });
    }

    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  } catch (error) {
    console.error('[M-PESA] Callback Error:', error);
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  }
}
