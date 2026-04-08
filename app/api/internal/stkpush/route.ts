import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { initiateDarajaStkPush } from '@/lib/mpesaClient';

export async function POST(req: NextRequest) {
  let sessionId = '';

  try {
    const body = await req.json();
    const payerPhone = body.payerPhone;
    const targetPhone = body.targetPhone;
    const amount = body.amount;
    sessionId = body.sessionId;

    await prisma.transaction.upsert({
      where: { transactionId: sessionId },
      update: {
        amount,
        phoneNumber: payerPhone,
        providerReference: null,
        status: 'PENDING_STK',
        targetPhone,
      },
      create: {
        transactionId: sessionId,
        phoneNumber: payerPhone,
        targetPhone,
        amount,
        status: 'PENDING_STK',
      },
    });

    const result = await initiateDarajaStkPush(payerPhone, amount, sessionId);

    if (result.ResponseCode !== '0' || !result.CheckoutRequestID) {
      await prisma.transaction.update({
        where: { transactionId: sessionId },
        data: {
          providerReference: result.MerchantRequestID ?? null,
          status: 'FAILED',
        },
      });

      return new Response(JSON.stringify({
        error: result.errorMessage || result.ResponseDescription || 'Failed to initiate STK push',
      }), { status: 502 });
    }

    await prisma.transaction.update({
      where: { transactionId: sessionId },
      data: {
        providerReference: [result.CheckoutRequestID, result.MerchantRequestID]
          .filter(Boolean)
          .map((value, index) => index === 0 ? `mpesa:${value}` : `mpesa-merchant:${value}`)
          .join('|'),
      },
    });

    return new Response(JSON.stringify({ success: true, result }), { status: 200 });
  } catch (error: any) {
    if (sessionId) {
      await prisma.transaction.updateMany({
        where: {
          transactionId: sessionId,
          status: 'PENDING_STK',
        },
        data: { status: 'FAILED' },
      });
    }

    console.error('STK Push Error:', error?.response?.data || error);
    return new Response(JSON.stringify({ error: 'Failed' }), { status: 500 });
  }
}
