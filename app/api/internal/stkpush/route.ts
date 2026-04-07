import { NextRequest } from 'next/server';
import { initiateStkPush } from '@/lib/airpulseClient';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const { payerPhone, targetPhone, amount, sessionId } = await req.json();

    const result = await initiateStkPush(payerPhone, targetPhone, amount, sessionId);
    
    // Save transaction state
    await prisma.transaction.create({
      data: {
        transactionId: sessionId,
        phoneNumber: payerPhone,
        targetPhone,
        amount,
        status: 'PENDING_STK'
      }
    });

    return new Response(JSON.stringify({ success: true, result }), { status: 200 });
  } catch (error: any) {
    console.error('STK Push Error:', error?.response?.data || error);
    return new Response(JSON.stringify({ error: 'Failed' }), { status: 500 });
  }
}
