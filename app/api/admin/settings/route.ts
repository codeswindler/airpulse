import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jwtVerify } from 'jose';
import { clearSmsBalanceCache } from '@/lib/smsClient';
import { clearAirPulseTokenCache } from '@/lib/airpulseClient';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_secret_32_chars_long_12345');

export async function GET(req: NextRequest) {
  try {
    const settings = await prisma.systemSetting.findMany();
    const config: Record<string, string> = {};
    settings.forEach(s => { config[s.key] = s.value; });
    return NextResponse.json(config);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // 1. Verify Role (Superadmin only)
    const token = req.cookies.get('admin_session')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Permission denied. Superadmin required.' }, { status: 403 });
    }

    const body = await req.json(); // e.g. { airpulse_api_key: '...', ... }

    const updates = Object.entries(body).map(([key, value]) => {
      return prisma.systemSetting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) }
      });
    });

    await Promise.all(updates);
    clearSmsBalanceCache();
    clearAirPulseTokenCache();
    return NextResponse.json({ success: true });

  } catch (err) {
    console.error('Settings Update Error:', err);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
