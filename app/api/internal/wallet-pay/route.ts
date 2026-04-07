import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { buyAirtimeFromBalance } from '@/lib/airpulseClient';
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
          status: 'PENDING_AIRTIME'
        }
      })
    ]);

    // 2. Trigger AirPulse
    const airtimeRes = await buyAirtimeFromBalance(targetPhone, amount, txId).catch(console.error);

    if (airtimeRes && (airtimeRes.status === 0 || airtimeRes.status === 20)) {
      await prisma.transaction.update({
        where: { transactionId: txId },
        data: { status: 'AIRTIME_DELIVERED' }
      });
      return NextResponse.json({ success: true });
    } else {
      // Refund if API fails immediately
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

  } catch (error: any) {
    console.error('Wallet Payment Internal Error:', error);
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}
