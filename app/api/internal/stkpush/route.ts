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
    const businessId = typeof body.businessId === 'string' && body.businessId.trim() ? body.businessId.trim() : null;

    await prisma.transaction.upsert({
      where: { transactionId: sessionId },
      update: {
        businessId,
        amount,
        phoneNumber: payerPhone,
        providerReference: null,
        status: 'PENDING_STK',
        targetPhone,
      },
      create: {
        businessId,
        transactionId: sessionId,
        phoneNumber: payerPhone,
        targetPhone,
        amount,
        status: 'PENDING_STK',
      },
    });

    const result = await initiateDarajaStkPush(payerPhone, amount, sessionId, businessId);

    if (result.ResponseCode !== '0' || !result.CheckoutRequestID) {
      console.error('[M-PESA] STK initiation rejected', {
        merchantRequestId: result.MerchantRequestID ?? 'missing',
        responseCode: result.ResponseCode ?? result.errorCode ?? 'missing',
        responseDescription: result.ResponseDescription ?? result.errorMessage ?? 'missing',
        sessionId,
      });

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

    const providerReference = [result.CheckoutRequestID, result.MerchantRequestID]
      .filter(Boolean)
      .map((value, index) => index === 0 ? `mpesa:${value}` : `mpesa-merchant:${value}`)
      .join('|');

    console.log('[M-PESA] STK initiation accepted', {
      checkoutRequestId: result.CheckoutRequestID,
      merchantRequestId: result.MerchantRequestID ?? 'missing',
      providerReference,
      sessionId,
    });

    await prisma.transaction.update({
      where: { transactionId: sessionId },
      data: {
        providerReference,
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

    console.error('STK Push Error:', {
      response: error?.response?.data,
      sessionId,
      status: error?.response?.status,
      statusText: error?.response?.statusText,
    });
    return new Response(JSON.stringify({ error: 'Failed' }), { status: 500 });
  }
}
