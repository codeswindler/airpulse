import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jwtVerify } from 'jose';
import { getSelectedBusinessIdFromRequest } from '@/lib/adminContext';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_secret_32_chars_long_12345');

async function getAuth(req: NextRequest) {
  const token = req.cookies.get('admin_session')?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch {
    return null;
  }
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
    const authBusinessId = typeof auth.businessId === 'string' && auth.businessId.trim()
      ? auth.businessId.trim()
      : null;
    const selectedBusinessId = await getSelectedBusinessIdFromRequest(req, authBusinessId, auth as any);
    if (!selectedBusinessId) {
      return NextResponse.json({ error: 'Select a business first' }, { status: 400 });
    }

    const { role } = await req.json();
    const normalizedRole = typeof role === 'string' ? role.toUpperCase() : '';

    if (!['BUSINESS_OWNER', 'BUSINESS_STAFF'].includes(normalizedRole)) {
      return NextResponse.json({ error: 'Invalid role for a business account' }, { status: 400 });
    }

    const targetAdmin = await prisma.admin.findUnique({
      where: { id },
      select: { id: true, businessId: true },
    });

    if (!targetAdmin || targetAdmin.businessId !== selectedBusinessId) {
      return NextResponse.json({ error: 'Admin not found for the selected business' }, { status: 404 });
    }

    const updated = await prisma.admin.update({
      where: { id },
      data: {
        role: normalizedRole as 'BUSINESS_OWNER' | 'BUSINESS_STAFF',
      },
      select: {
        id: true,
        email: true,
        name: true,
        phoneNumber: true,
        role: true,
        updatedAt: true,
        businessId: true,
        business: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      }
    });

    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
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

  // Prevent self-deletion
  if (auth.id === id) {
    return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 });
  }

  try {
    const authBusinessId = typeof auth.businessId === 'string' && auth.businessId.trim()
      ? auth.businessId.trim()
      : null;
    const selectedBusinessId = await getSelectedBusinessIdFromRequest(req, authBusinessId, auth as any);
    if (!selectedBusinessId) {
      return NextResponse.json({ error: 'Select a business first' }, { status: 400 });
    }

    const targetAdmin = await prisma.admin.findUnique({
      where: { id },
      select: { id: true, businessId: true },
    });

    if (!targetAdmin || targetAdmin.businessId !== selectedBusinessId) {
      return NextResponse.json({ error: 'Admin not found for the selected business' }, { status: 404 });
    }

    await prisma.admin.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Deletion failed' }, { status: 500 });
  }
}
