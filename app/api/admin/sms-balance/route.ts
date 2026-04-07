import { NextRequest, NextResponse } from 'next/server';
import { getSmsBalance } from '@/lib/smsClient';

export async function GET(req: NextRequest) {
  try {
    const balance = await getSmsBalance();
    return NextResponse.json({ balance });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch balance' }, { status: 500 });
  }
}
