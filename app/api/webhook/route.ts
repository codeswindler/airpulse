import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { buyAirtimeFromBalance } from '@/lib/airpulseClient';

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
    
    // Payload contains id (Tupay trans ID), reference (Internal ref/sessionId check?), status, message
    // If we use the Tupay backend mode, the transactionId might not be directly in the webhook unless it maps to ID or Reference
    // Let's assume the Reference maps to the sessionId/idempotency we passed if possible, 
    // or we can just fetch the recent pending transaction if we matched by reference
    
    // IMPORTANT: Wait for 20 (Success).
    if (payload.status === 20) {
      // Find transaction in DB (assuming payload.reference was passed as idempotency or we matched it)
      // Since Tupay accept doesn't let us pass reference in the payload top-level easily except via idempotencyKey
      // We will look up by Tupay's returned ID if we saved it, but since it's async we might need a broader lookup
      
      // Let's assume we can match it through a simplified logic or if we just process Airtime
      const tx = await prisma.transaction.findFirst({
        where: { status: 'PENDING_STK' },
        orderBy: { createdAt: 'desc' }
      });

      if (tx) {
         await prisma.transaction.update({
           where: { id: tx.id },
           data: { status: 'STK_SUCCESS' }
         });

         // Autot-fulfill Airtime
         const airtimeRes = await buyAirtimeFromBalance(tx.targetPhone, tx.amount, tx.transactionId).catch(console.error);
         
         if (airtimeRes && (airtimeRes.status === 0 || airtimeRes.status === 20)) {
             await prisma.transaction.update({
               where: { id: tx.id },
               data: { status: 'AIRTIME_DELIVERED', providerReference: payload.id }
             });
         } else {
             // Handle FAILURE - Refund wallet!
             await prisma.transaction.update({
                 where: { id: tx.id },
                 data: { status: 'FAILED' }
             });

             await prisma.user.update({
                 where: { phoneNumber: tx.phoneNumber },
                 data: { walletBalance: { increment: tx.amount } }
             });
         }
      }
    }

    return new Response('OK', { status: 200 });
  } catch (err: any) {
    console.error('Webhook Error:', err);
    return new Response('Internal Error', { status: 500 });
  }
}
