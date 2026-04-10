import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jwtVerify } from 'jose';

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
    const { role, businessId } = await req.json();

    if (businessId) {
      const business = await prisma.business.findUnique({ where: { id: businessId } });
      if (!business) {
        return NextResponse.json({ error: 'Selected business does not exist' }, { status: 400 });
      }
    }

    const updated = await prisma.admin.update({
      where: { id },
      data: {
        ...(role ? { role } : {}),
        businessId: businessId === undefined ? undefined : businessId || null,
      },
      select: {
        id: true,
        email: true,
        name: true,
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
    await prisma.admin.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Deletion failed' }, { status: 500 });
  }
}
