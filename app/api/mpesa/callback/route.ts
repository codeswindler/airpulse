import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { buyAirtimeFromBalance, isTupayPendingStatus, isTupaySuccessStatus } from '@/lib/airpulseClient';
import { parseMpesaCallback } from '@/lib/mpesaClient';
import { sendAirtimeNotification } from '@/lib/smsClient';

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

function hasProviderFlag(providerReference: string | null | undefined, flag: string) {
  return providerReference?.split('|').includes(flag) ?? false;
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
      console.warn('[M-PESA] Callback failed before fulfillment', {
        checkoutRequestId: callback.checkoutRequestId || 'missing',
        merchantRequestId: callback.merchantRequestId || 'missing',
        resultCode: callback.resultCode,
        resultDesc: callback.resultDesc,
        transactionId: transaction.transactionId,
      });

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

    console.log('[M-PESA] Payment confirmed, starting Tupay fulfillment', {
      amount: transaction.amount,
      checkoutRequestId: callback.checkoutRequestId || 'missing',
      targetPhone: `${transaction.targetPhone.slice(0, 3)}***${transaction.targetPhone.slice(-3)}`,
      transactionId: transaction.transactionId,
    });

    const airtimeRes = await buyAirtimeFromBalance(
      transaction.targetPhone,
      transaction.amount,
      transaction.transactionId,
      transaction.businessId,
    );
    const providerReference = buildProviderReference(
      transaction.providerReference,
      airtimeRes?.id ? `tupay:${airtimeRes.id}` : null,
    );

    console.log('[TUPAY] Fulfillment response after M-PESA success', {
      providerReference,
      status: airtimeRes?.status ?? 'missing',
      transactionId: transaction.transactionId,
      tupayId: airtimeRes?.id ?? 'missing',
    });

    if (isTupaySuccessStatus(airtimeRes?.status)) {
      let nextProviderReference = providerReference;

      if (!hasProviderFlag(transaction.providerReference, 'sms:delivered')) {
        try {
          await sendAirtimeNotification({
            amount: transaction.amount,
            payerPhone: transaction.phoneNumber,
            stage: 'delivered',
            targetPhone: transaction.targetPhone,
            transactionId: transaction.transactionId,
            businessId: transaction.businessId,
          });
          nextProviderReference = buildProviderReference(nextProviderReference, 'sms:delivered');
        } catch (error) {
          console.error('[SMS] Delivered notification failed', { error, transactionId: transaction.transactionId });
        }
      }

      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          providerReference: nextProviderReference,
          status: 'AIRTIME_DELIVERED',
        },
      });
    } else if (isTupayPendingStatus(airtimeRes?.status)) {
      let nextProviderReference = providerReference;

      if (!hasProviderFlag(transaction.providerReference, 'sms:pending')) {
        try {
          await sendAirtimeNotification({
            amount: transaction.amount,
            payerPhone: transaction.phoneNumber,
            stage: 'pending',
            targetPhone: transaction.targetPhone,
            transactionId: transaction.transactionId,
            businessId: transaction.businessId,
          });
          nextProviderReference = buildProviderReference(nextProviderReference, 'sms:pending');
        } catch (error) {
          console.error('[SMS] Pending notification failed', { error, transactionId: transaction.transactionId });
        }
      }

      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          providerReference: nextProviderReference,
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
