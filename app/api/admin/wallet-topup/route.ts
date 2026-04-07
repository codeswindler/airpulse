import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const { phoneNumber, amount } = await req.json();

    if (!phoneNumber || !amount || isNaN(amount)) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { phoneNumber },
      data: {
        walletBalance: {
          increment: parseFloat(amount)
        }
      }
    });

    return NextResponse.json({ success: true, balance: updatedUser.walletBalance });
  } catch (error: any) {
    console.error('Wallet Top-Up Error:', error);
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}
