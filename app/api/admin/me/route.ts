import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { getSelectedBusinessIdFromRequest } from '@/lib/adminContext';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_secret_32_chars_long_12345');

async function issueAdminToken(admin: {
  id: string;
  email: string;
  role: string;
  name: string | null;
  businessId: string | null;
}) {
  return new SignJWT({
    id: admin.id,
    email: admin.email,
    role: admin.role,
    name: admin.name,
    businessId: admin.businessId,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET);
}

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('admin_session')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { payload } = await jwtVerify(token, JWT_SECRET);
    const admin = await prisma.admin.findUnique({
      where: { id: String(payload.id) },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!admin) {
      return NextResponse.json({ error: 'Invalid Session' }, { status: 401 });
    }

    const selectedBusinessId = await getSelectedBusinessIdFromRequest(
      req,
      admin.businessId ?? null,
      {
        id: admin.id,
        email: admin.email,
        role: admin.role,
        businessId: admin.businessId,
        name: admin.name ?? undefined,
      },
    );

    const selectedBusiness = selectedBusinessId
      ? await prisma.business.findUnique({
          where: { id: selectedBusinessId },
          select: {
            id: true,
            name: true,
            slug: true,
            serviceCode: true,
            status: true,
          },
        })
      : null;

    return NextResponse.json({
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      businessId: admin.businessId,
      business: admin.business,
      selectedBusinessId,
      selectedBusiness,
    });
  } catch (err) {
    return NextResponse.json({ error: 'Invalid Session' }, { status: 401 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const token = req.cookies.get('admin_session')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { payload } = await jwtVerify(token, JWT_SECRET);
    const admin = await prisma.admin.findUnique({
      where: { id: String(payload.id) },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!admin) {
      return NextResponse.json({ error: 'Invalid Session' }, { status: 401 });
    }

    const body = await req.json();
    const nextName = typeof body.name === 'string' ? body.name.trim() : '';
    const nextEmail = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : '';
    const nextPassword = typeof body.password === 'string' ? body.password : '';

    const updatedName = nextName || admin.name || '';
    const updatedEmail = nextEmail || admin.email;

    if (!updatedName) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (updatedEmail !== admin.email) {
      const existing = await prisma.admin.findUnique({ where: { email: updatedEmail } });
      if (existing && existing.id !== admin.id) {
        return NextResponse.json({ error: 'Email already in use' }, { status: 400 });
      }
    }

    let passwordHash: string | null = null;
    if (nextPassword) {
      if (!currentPassword) {
        return NextResponse.json({ error: 'Current password is required to change your password' }, { status: 400 });
      }

      const passwordMatches = await bcrypt.compare(currentPassword, admin.password);
      if (!passwordMatches) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
      }

      passwordHash = await bcrypt.hash(nextPassword, 10);
    }

    const updated = await prisma.admin.update({
      where: { id: admin.id },
      data: {
        name: updatedName,
        email: updatedEmail,
        ...(passwordHash ? { password: passwordHash } : {}),
      },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    const nextToken = await issueAdminToken({
      id: updated.id,
      email: updated.email,
      role: updated.role,
      name: updated.name,
      businessId: updated.businessId,
    });

    return NextResponse.json({
      success: true,
      token: nextToken,
      user: {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        role: updated.role,
        businessId: updated.businessId,
        business: updated.business,
      },
    });
  } catch (err) {
    console.error('[ADMIN ME] Profile update failed', err);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
