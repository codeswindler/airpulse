import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jwtVerify } from 'jose';
import { clearSmsBalanceCache } from '@/lib/smsClient';
import { clearAirPulseTokenCache, clearTupayBalanceCache } from '@/lib/airpulseClient';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_secret_32_chars_long_12345');

function getSettingValue(settings: Array<{ key: string; value: string }>, key: string, fallback = '') {
  return settings.find((setting) => setting.key === key)?.value ?? fallback;
}

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('admin_session')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const settings = await prisma.systemSetting.findMany();
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Permission denied. Superadmin required.' }, { status: 403 });
    }

    const appUrl = process.env.APP_URL?.trim() || new URL(req.url).origin;

    return NextResponse.json({
      sharedCallbacks: {
        mpesaCallbackUrl: `${appUrl}/api/mpesa/callback`,
        tupayWebhookUrl: `${appUrl}/api/webhook`,
        ussdEndpointUrl: `${appUrl}/api/ussd`,
      },
      platformSms: {
        sms_provider: getSettingValue(settings, 'sms_provider', 'advanta'),
        sms_threshold: getSettingValue(settings, 'sms_threshold', '500'),
        advanta_partner_id: getSettingValue(settings, 'advanta_partner_id'),
        advanta_api_key: getSettingValue(settings, 'advanta_api_key'),
        advanta_sender_id: getSettingValue(settings, 'advanta_sender_id'),
        onfon_access_key: getSettingValue(settings, 'onfon_access_key'),
        onfon_api_key: getSettingValue(settings, 'onfon_api_key'),
        onfon_client_id: getSettingValue(settings, 'onfon_client_id'),
        onfon_sender_id: getSettingValue(settings, 'onfon_sender_id'),
      },
      platformEmail: {
        smtp_host: getSettingValue(settings, 'smtp_host'),
        smtp_port: getSettingValue(settings, 'smtp_port'),
        smtp_user: getSettingValue(settings, 'smtp_user'),
        smtp_pass: getSettingValue(settings, 'smtp_pass'),
        smtp_secure: getSettingValue(settings, 'smtp_secure', 'tls'),
        smtp_from_email: getSettingValue(settings, 'smtp_from_email'),
        smtp_from_name: getSettingValue(settings, 'smtp_from_name'),
        smtp_enabled: getSettingValue(settings, 'smtp_enabled', 'true'),
      },
      note: 'These callbacks are shared across every business account.',
    });
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
    clearTupayBalanceCache();
    return NextResponse.json({ success: true });

  } catch (err) {
    console.error('Settings Update Error:', err);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
