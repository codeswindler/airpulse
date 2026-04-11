import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jwtVerify } from 'jose';
import { clearAirPulseTokenCache, clearTupayBalanceCache } from '@/lib/airpulseClient';
import { clearSmsBalanceCache } from '@/lib/smsClient';
import { clearMpesaTokenCache } from '@/lib/mpesaClient';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_secret_32_chars_long_12345');

type AdminAuthPayload = {
  id?: string;
  email?: string;
  role?: string;
};

async function getAuth(req: NextRequest): Promise<AdminAuthPayload | null> {
  const token = req.cookies.get('admin_session')?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as AdminAuthPayload;
  } catch {
    return null;
  }
}

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function cleanString(value: unknown) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

function cleanNullableString(value: unknown) {
  const cleaned = cleanString(value);
  return cleaned ? cleaned : null;
}

function parseNullableDate(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseOptionalNumber(value: unknown) {
  if (value === null || typeof value === 'undefined' || value === '') {
    return null;
  }

  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function getEffectiveSubscriptionEndsAt(business: { subscriptionEndsAt: Date | null; createdAt: Date }) {
  return business.subscriptionEndsAt ?? new Date(business.createdAt.getTime() + 30 * 24 * 60 * 60 * 1000);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await getAuth(req);

  if (!auth || auth.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
  }

  try {
    const business = await prisma.business.findUnique({ where: { id } });

    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const body = await req.json();
    const hasField = (key: string) => Object.prototype.hasOwnProperty.call(body, key);
    const name = hasField('name') ? (cleanString(body.name) || business.name) : business.name;
    const rawSlug = hasField('slug') ? cleanString(body.slug) : '';
    const slug = rawSlug ? normalizeSlug(rawSlug) : business.slug;
    const serviceCode = hasField('serviceCode') ? cleanNullableString(body.serviceCode) : business.serviceCode;
    const description = hasField('description') ? cleanNullableString(body.description) : business.description;
    const status: 'ACTIVE' | 'SUSPENDED' = hasField('status')
      ? (cleanString(body.status).toUpperCase() === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE')
      : business.status;
    const ownerName = hasField('ownerName') ? cleanNullableString(body.ownerName) : business.ownerName;
    const ownerEmail = hasField('ownerEmail') ? cleanNullableString(body.ownerEmail) : business.ownerEmail;
    const ownerPhone = hasField('ownerPhone') ? cleanNullableString(body.ownerPhone) : business.ownerPhone;
    const absoluteSubscriptionEndsAt = parseNullableDate(body.subscriptionEndsAt);
    const subscriptionDeltaDays = parseOptionalNumber(body.subscriptionDeltaDays);
    const subscriptionDeltaHours = parseOptionalNumber(body.subscriptionDeltaHours);
    const subscriptionMode = cleanString(body.subscriptionMode).toUpperCase() === 'DEBIT' ? 'DEBIT' : 'ADD';

    if (slug !== business.slug) {
      const existingSlug = await prisma.business.findUnique({ where: { slug } });
      if (existingSlug && existingSlug.id !== id) {
        return NextResponse.json({ error: 'A business with this slug already exists' }, { status: 400 });
      }
    }

    if (serviceCode && serviceCode !== business.serviceCode) {
      const existingServiceCode = await prisma.business.findUnique({ where: { serviceCode } });
      if (existingServiceCode && existingServiceCode.id !== id) {
        return NextResponse.json({ error: 'A business with this USSD code already exists' }, { status: 400 });
      }
    }

    let nextSubscriptionEndsAt = getEffectiveSubscriptionEndsAt(business);
    if (absoluteSubscriptionEndsAt) {
      nextSubscriptionEndsAt = absoluteSubscriptionEndsAt;
    }

    if (subscriptionDeltaDays !== null || subscriptionDeltaHours !== null) {
      const dayHours = (subscriptionDeltaDays ?? 0) * 24 + (subscriptionDeltaHours ?? 0);
      const direction = subscriptionMode === 'DEBIT' ? -1 : 1;
      nextSubscriptionEndsAt = new Date(nextSubscriptionEndsAt.getTime() + dayHours * 60 * 60 * 1000 * direction);
    }

    const updatedBusiness = await prisma.business.update({
      where: { id },
      data: {
        name,
        slug,
        serviceCode,
        status,
        ownerName,
        ownerEmail,
        ownerPhone,
        description,
        subscriptionEndsAt: nextSubscriptionEndsAt,
        mpesaConsumerKey: hasField('mpesaConsumerKey') ? cleanNullableString(body.mpesaConsumerKey) : business.mpesaConsumerKey,
        mpesaConsumerSecret: hasField('mpesaConsumerSecret') ? cleanNullableString(body.mpesaConsumerSecret) : business.mpesaConsumerSecret,
        mpesaPasskey: hasField('mpesaPasskey') ? cleanNullableString(body.mpesaPasskey) : business.mpesaPasskey,
        mpesaShortcode: hasField('mpesaShortcode') ? cleanNullableString(body.mpesaShortcode) : business.mpesaShortcode,
        mpesaBusinessShortcode: hasField('mpesaBusinessShortcode') ? cleanNullableString(body.mpesaBusinessShortcode) : business.mpesaBusinessShortcode,
        mpesaPartyB: hasField('mpesaPartyB') ? cleanNullableString(body.mpesaPartyB) : business.mpesaPartyB,
        mpesaEnvironment: hasField('mpesaEnvironment') ? (cleanString(body.mpesaEnvironment) || 'production') : business.mpesaEnvironment,
        mpesaTransactionType: hasField('mpesaTransactionType') ? (cleanString(body.mpesaTransactionType) || 'CustomerBuyGoodsOnline') : business.mpesaTransactionType,
        mpesaCallbackUrl: hasField('mpesaCallbackUrl') ? cleanNullableString(body.mpesaCallbackUrl) : business.mpesaCallbackUrl,
        tupayUuid: hasField('tupayUuid') ? cleanNullableString(body.tupayUuid) : business.tupayUuid,
        tupayApiKey: hasField('tupayApiKey') ? cleanNullableString(body.tupayApiKey) : business.tupayApiKey,
        tupaySecret: hasField('tupaySecret') ? cleanNullableString(body.tupaySecret) : business.tupaySecret,
        smsProvider: hasField('smsProvider') ? cleanNullableString(body.smsProvider) : business.smsProvider,
        smsPartnerId: hasField('smsPartnerId') ? cleanNullableString(body.smsPartnerId) : business.smsPartnerId,
        smsApiKey: hasField('smsApiKey') ? cleanNullableString(body.smsApiKey) : business.smsApiKey,
        smsSenderId: hasField('smsSenderId') ? cleanNullableString(body.smsSenderId) : business.smsSenderId,
        smsAccessKey: hasField('smsAccessKey') ? cleanNullableString(body.smsAccessKey) : business.smsAccessKey,
        smsClientId: hasField('smsClientId') ? cleanNullableString(body.smsClientId) : business.smsClientId,
      },
      include: {
        admins: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            phoneNumber: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        _count: {
          select: { admins: true },
        },
      },
    });

    if (hasField('ownerPhone')) {
      await prisma.admin.updateMany({
        where: {
          businessId: id,
          role: 'BUSINESS_OWNER',
        },
        data: {
          phoneNumber: ownerPhone,
        },
      });
    }

    clearAirPulseTokenCache(id);
    clearTupayBalanceCache(id);
    clearSmsBalanceCache(id);
    clearMpesaTokenCache(id);

    return NextResponse.json({ business: updatedBusiness });
  } catch (error) {
    console.error('[BUSINESSES] Update failed', error);
    return NextResponse.json({ error: 'Business update failed' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await getAuth(req);

  if (!auth || auth.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
  }

  try {
    const business = await prisma.business.findUnique({
      where: { id },
      select: { id: true, name: true },
    });

    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.admin.deleteMany({ where: { businessId: id } });
      await tx.transaction.deleteMany({ where: { businessId: id } });
      await tx.ussdSession.deleteMany({ where: { businessId: id } });
      await tx.savedPhone.deleteMany({ where: { businessId: id } });
      await tx.user.deleteMany({ where: { businessId: id } });
      await tx.business.delete({ where: { id } });
    });

    clearAirPulseTokenCache(id);
    clearTupayBalanceCache(id);
    clearSmsBalanceCache(id);
    clearMpesaTokenCache(id);

    return NextResponse.json({ success: true, deletedBusinessId: id });
  } catch (error) {
    console.error('[BUSINESSES] Delete failed', error);
    return NextResponse.json({ error: 'Business delete failed' }, { status: 500 });
  }
}
