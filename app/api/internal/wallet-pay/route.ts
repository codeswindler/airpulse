import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { buyAirtimeFromBalance, isTupayPendingStatus, isTupaySuccessStatus } from '@/lib/airpulseClient';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  try {
    const { payerPhone, targetPhone, amount, sessionId } = await req.json();

    // 1. Transactional Update: Deduct balance
    const user = await prisma.user.findUnique({ where: { phoneNumber: payerPhone } });
    
    if (!user || user.walletBalance < amount) {
      return NextResponse.json({ error: 'Insufficient funds' }, { status: 400 });
    }

    const txId = uuidv4();

    // Start database transaction
    await prisma.$transaction([
      prisma.user.update({
        where: { phoneNumber: payerPhone },
        data: { walletBalance: { decrement: amount } }
      }),
      prisma.transaction.create({
        data: {
          transactionId: txId,
          phoneNumber: payerPhone,
          targetPhone,
          amount,
          providerReference: 'wallet',
          status: 'PENDING_AIRTIME'
        }
      })
    ]);

    let airtimeRes;

    try {
      airtimeRes = await buyAirtimeFromBalance(targetPhone, amount, txId);
    } catch (airtimeError) {
      console.error('Wallet Airtime Fulfillment Error:', airtimeError);

      await prisma.$transaction([
        prisma.user.update({
          where: { phoneNumber: payerPhone },
          data: { walletBalance: { increment: amount } }
        }),
        prisma.transaction.update({
          where: { transactionId: txId },
          data: { status: 'FAILED' }
        })
      ]);

      return NextResponse.json({ error: 'Airtime API Failure' }, { status: 500 });
    }

    const providerReference = airtimeRes?.id ? `wallet|tupay:${airtimeRes.id}` : 'wallet';

    if (isTupaySuccessStatus(airtimeRes?.status)) {
      await prisma.transaction.update({
        where: { transactionId: txId },
        data: {
          providerReference,
          status: 'AIRTIME_DELIVERED',
        }
      });
      return NextResponse.json({ success: true });
    } else if (isTupayPendingStatus(airtimeRes?.status)) {
      await prisma.transaction.update({
        where: { transactionId: txId },
        data: {
          providerReference,
          status: 'PENDING_AIRTIME',
        },
      });
      return NextResponse.json({ success: true, pending: true });
    } else {
      // Refund if API fails immediately
      await prisma.$transaction([
        prisma.user.update({
          where: { phoneNumber: payerPhone },
          data: { walletBalance: { increment: amount } }
        }),
        prisma.transaction.update({
          where: { transactionId: txId },
          data: {
            providerReference,
            status: 'FAILED',
          }
        })
      ]);
      return NextResponse.json({ error: 'Airtime API Failure' }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Wallet Payment Internal Error:', error);
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}
