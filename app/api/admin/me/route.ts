import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { getSelectedBusinessIdFromRequest } from '@/lib/adminContext';
import { issueAdminToken } from '@/lib/adminTokens';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_secret_32_chars_long_12345');

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
      phoneNumber: admin.phoneNumber,
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
    const nextPhoneNumber = typeof body.phoneNumber === 'string' ? body.phoneNumber.trim() : '';
    const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : '';
    const nextPassword = typeof body.password === 'string' ? body.password : '';

    const updatedName = nextName || admin.name || '';
    const updatedEmail = nextEmail || admin.email;
    const updatedPhoneNumber = nextPhoneNumber || admin.phoneNumber || null;

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
        phoneNumber: updatedPhoneNumber,
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
      phoneNumber: updated.phoneNumber,
    });

    return NextResponse.json({
      success: true,
      token: nextToken,
      user: {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        phoneNumber: updated.phoneNumber,
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
