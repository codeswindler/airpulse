import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jwtVerify } from 'jose';

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
    const name = cleanString(body.name) || business.name;
    const rawSlug = cleanString(body.slug);
    const slug = rawSlug ? normalizeSlug(rawSlug) : business.slug;
    const serviceCode = cleanNullableString(body.serviceCode);
    const description = cleanNullableString(body.description);
    const status: 'ACTIVE' | 'SUSPENDED' = cleanString(body.status).toUpperCase() === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE';

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

    const updatedBusiness = await prisma.business.update({
      where: { id },
      data: {
        name,
        slug,
        serviceCode,
        status,
        ownerName: cleanNullableString(body.ownerName),
        ownerEmail: cleanNullableString(body.ownerEmail),
        description,
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
      },
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

    return NextResponse.json({ business: updatedBusiness });
  } catch (error) {
    console.error('[BUSINESSES] Update failed', error);
    return NextResponse.json({ error: 'Business update failed' }, { status: 500 });
  }
}
