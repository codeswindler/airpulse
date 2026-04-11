import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_secret_32_chars_long_12345');

type AdminAuthPayload = {
  id?: string;
  email?: string;
  role?: string;
  businessId?: string | null;
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

function buildSubscriptionSummary(subscriptionEndsAt: Date | string | null | undefined) {
  if (!subscriptionEndsAt) {
    return {
      endsAt: null,
      isExpired: false,
      daysRemaining: null as number | null,
    };
  }

  const endsAt = new Date(subscriptionEndsAt);
  const diffMs = endsAt.getTime() - Date.now();
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return {
    endsAt: endsAt.toISOString(),
    isExpired: diffMs <= 0,
    daysRemaining,
  };
}

function serializeBusiness(business: any) {
  const owner = business.admins?.find((admin: any) => admin.role === 'BUSINESS_OWNER') ?? business.admins?.[0] ?? null;
  const subscriptionEndsAt = business.subscriptionEndsAt ?? new Date(business.createdAt.getTime() + 30 * 24 * 60 * 60 * 1000);
  const configuredFields = [
    business.mpesaConsumerKey,
    business.mpesaConsumerSecret,
    business.mpesaPasskey,
    business.mpesaShortcode,
    business.mpesaBusinessShortcode,
    business.mpesaPartyB,
    business.mpesaCallbackUrl,
    business.tupayUuid,
    business.tupayApiKey,
    business.tupaySecret,
    business.smsProvider,
  ].filter((value: string | null | undefined) => typeof value === 'string' && value.trim() !== '').length;

  return {
    id: business.id,
    name: business.name,
    slug: business.slug,
    serviceCode: business.serviceCode,
    status: business.status,
    description: business.description,
    ownerName: owner?.name ?? business.ownerName ?? null,
    ownerEmail: owner?.email ?? business.ownerEmail ?? null,
    createdAt: business.createdAt,
    updatedAt: business.updatedAt,
    subscriptionEndsAt,
    subscription: buildSubscriptionSummary(subscriptionEndsAt),
    credentialFill: {
      mpesa: Boolean(
        business.mpesaConsumerKey &&
        business.mpesaConsumerSecret &&
        business.mpesaPasskey &&
        business.mpesaShortcode &&
        business.mpesaBusinessShortcode &&
        business.mpesaPartyB &&
        business.mpesaCallbackUrl
      ),
      tupay: Boolean(business.tupayUuid && business.tupayApiKey && business.tupaySecret),
      sms: Boolean(business.smsProvider && (
        (business.smsProvider === 'advanta' && business.smsPartnerId && business.smsApiKey && business.smsSenderId) ||
        (business.smsProvider === 'onfon' && business.smsAccessKey && business.smsApiKey && business.smsClientId && business.smsSenderId)
      )),
      total: configuredFields,
    },
    credentials: {
      mpesaConsumerKey: business.mpesaConsumerKey ?? '',
      mpesaConsumerSecret: business.mpesaConsumerSecret ?? '',
      mpesaPasskey: business.mpesaPasskey ?? '',
      mpesaShortcode: business.mpesaShortcode ?? '',
      mpesaBusinessShortcode: business.mpesaBusinessShortcode ?? '',
      mpesaPartyB: business.mpesaPartyB ?? '',
      mpesaEnvironment: business.mpesaEnvironment ?? 'production',
      mpesaTransactionType: business.mpesaTransactionType ?? 'CustomerBuyGoodsOnline',
      mpesaCallbackUrl: business.mpesaCallbackUrl ?? '',
      tupayUuid: business.tupayUuid ?? '',
      tupayApiKey: business.tupayApiKey ?? '',
      tupaySecret: business.tupaySecret ?? '',
      smsProvider: business.smsProvider ?? '',
      smsPartnerId: business.smsPartnerId ?? '',
      smsApiKey: business.smsApiKey ?? '',
      smsSenderId: business.smsSenderId ?? '',
      smsAccessKey: business.smsAccessKey ?? '',
      smsClientId: business.smsClientId ?? '',
    },
    adminCount: business._count?.admins ?? 0,
  };
}

export async function GET(req: NextRequest) {
  const auth = await getAuth(req);

  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    if (auth.role === 'SUPERADMIN') {
      const businesses = await prisma.business.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          admins: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
            orderBy: { createdAt: 'asc' },
          },
          _count: {
            select: { admins: true },
          },
        },
      });

      return NextResponse.json({
        businesses: businesses.map(serializeBusiness),
      });
    }

    if (!auth.businessId) {
      return NextResponse.json({ businesses: [] });
    }

    const business = await prisma.business.findUnique({
      where: { id: auth.businessId },
      include: {
        admins: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        _count: {
          select: { admins: true },
        },
      },
    });

    if (!business) {
      return NextResponse.json({ businesses: [] });
    }

    return NextResponse.json({ businesses: [serializeBusiness(business)] });
  } catch (error) {
    console.error('[BUSINESSES] Failed to fetch businesses', error);
    return NextResponse.json({ error: 'Failed to fetch businesses' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await getAuth(req);

  if (!auth || auth.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const name = cleanString(body.name);
    const slug = normalizeSlug(cleanString(body.slug) || name);
    const serviceCode = cleanNullableString(body.serviceCode);
    const description = cleanNullableString(body.description);
    const status: 'ACTIVE' | 'SUSPENDED' = cleanString(body.status).toUpperCase() === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE';
    const ownerName = cleanNullableString(body.ownerName);
    const ownerEmail = cleanNullableString(body.ownerEmail);
    const ownerPassword = cleanNullableString(body.ownerPassword);
    const ownerRole: 'BUSINESS_OWNER' | 'BUSINESS_STAFF' = cleanString(body.ownerRole).toUpperCase() === 'BUSINESS_STAFF'
      ? 'BUSINESS_STAFF'
      : 'BUSINESS_OWNER';

    if (!name) {
      return NextResponse.json({ error: 'Business name is required' }, { status: 400 });
    }

    if (!ownerEmail || !ownerPassword) {
      return NextResponse.json({ error: 'Business owner email and password are required' }, { status: 400 });
    }

    const existingSlug = await prisma.business.findUnique({ where: { slug } });
    if (existingSlug) {
      return NextResponse.json({ error: 'A business with this slug already exists' }, { status: 400 });
    }

    if (serviceCode) {
      const existingServiceCode = await prisma.business.findUnique({ where: { serviceCode } });
      if (existingServiceCode) {
        return NextResponse.json({ error: 'A business with this USSD code already exists' }, { status: 400 });
      }
    }

    const ownerExists = await prisma.admin.findUnique({ where: { email: ownerEmail } });
    if (ownerExists) {
      return NextResponse.json({ error: 'An admin with this email already exists' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(ownerPassword, 10);

    const business = await prisma.$transaction(async (tx) => {
      const createdBusiness = await tx.business.create({
        data: {
          name,
          slug,
          serviceCode,
          status,
          ownerName,
          ownerEmail,
          description,
          subscriptionEndsAt: parseNullableDate(body.subscriptionEndsAt) ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          mpesaConsumerKey: cleanNullableString(body.mpesaConsumerKey),
          mpesaConsumerSecret: cleanNullableString(body.mpesaConsumerSecret),
          mpesaPasskey: cleanNullableString(body.mpesaPasskey),
          mpesaShortcode: cleanNullableString(body.mpesaShortcode),
          mpesaBusinessShortcode: cleanNullableString(body.mpesaBusinessShortcode),
          mpesaPartyB: cleanNullableString(body.mpesaPartyB),
          mpesaEnvironment: cleanString(body.mpesaEnvironment) || 'production',
          mpesaTransactionType: cleanString(body.mpesaTransactionType) || 'CustomerBuyGoodsOnline',
          mpesaCallbackUrl: cleanNullableString(body.mpesaCallbackUrl),
          tupayUuid: cleanNullableString(body.tupayUuid),
          tupayApiKey: cleanNullableString(body.tupayApiKey),
          tupaySecret: cleanNullableString(body.tupaySecret),
          smsProvider: cleanNullableString(body.smsProvider),
          smsPartnerId: cleanNullableString(body.smsPartnerId),
          smsApiKey: cleanNullableString(body.smsApiKey),
          smsSenderId: cleanNullableString(body.smsSenderId),
          smsAccessKey: cleanNullableString(body.smsAccessKey),
          smsClientId: cleanNullableString(body.smsClientId),
          admins: {
            create: {
              email: ownerEmail,
              password: hashedPassword,
              name: ownerName || name,
              role: ownerRole,
            },
          },
        },
        include: {
          admins: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          _count: {
            select: { admins: true },
          },
        },
      });

      return createdBusiness;
    });

    return NextResponse.json({ business: serializeBusiness(business) }, { status: 201 });
  } catch (error: any) {
    console.error('[BUSINESSES] Creation failed', error);
    return NextResponse.json({
      error: error?.message || 'Business creation failed',
    }, { status: 500 });
  }
}
