import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSessionFromRequest, getSelectedBusinessIdFromRequest } from '@/lib/adminContext';

export async function POST(req: NextRequest) {
  try {
    const auth = await getAdminSessionFromRequest(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { phoneNumber, amount, businessId: bodyBusinessId } = await req.json();
    const amountValue = Number(amount);
    const selectedBusinessId = auth.role === 'SUPERADMIN'
      ? (
          typeof bodyBusinessId === 'string' && bodyBusinessId.trim()
            ? bodyBusinessId.trim()
            : await getSelectedBusinessIdFromRequest(req, auth.businessId ?? null, auth)
        )
      : (auth.businessId ?? null);

    if (!phoneNumber || !amount || Number.isNaN(amountValue)) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    if (auth.role !== 'SUPERADMIN' && !auth.businessId) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const lookupWhere = {
      phoneNumber: String(phoneNumber).trim(),
      businessId: selectedBusinessId ?? auth.businessId ?? null,
    };

    const existingUser = await prisma.user.findFirst({ where: lookupWhere });
    const updatedUser = existingUser
      ? await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            walletBalance: {
              increment: amountValue,
            },
          },
        })
      : await prisma.user.create({
          data: {
            ...lookupWhere,
            walletBalance: amountValue,
          },
        });

    return NextResponse.json({ success: true, balance: updatedUser.walletBalance });
  } catch (error: any) {
    console.error('Wallet Top-Up Error:', error);
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}
