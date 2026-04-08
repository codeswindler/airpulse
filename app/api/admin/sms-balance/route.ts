import { NextRequest, NextResponse } from 'next/server';
import { getSmsBalance } from '@/lib/smsClient';

export async function GET(req: NextRequest) {
  try {
    const balance = await getSmsBalance();
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
