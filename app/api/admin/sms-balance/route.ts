import { NextRequest, NextResponse } from 'next/server';
import { getSmsBalance } from '@/lib/smsClient';
import { getAdminSessionFromRequest, getSelectedBusinessIdFromRequest } from '@/lib/adminContext';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAdminSessionFromRequest(req);

    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const requestedBusinessId = req.nextUrl.searchParams.get('businessId')?.trim() || null;
    const selectedBusinessId = auth.role === 'SUPERADMIN'
      ? (requestedBusinessId || await getSelectedBusinessIdFromRequest(req, auth.businessId ?? null, auth))
      : (auth.businessId ?? null);

    const balance = await getSmsBalance(selectedBusinessId);
    return NextResponse.json(
      { balance },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch balance' }, { status: 500 });
  }
}
