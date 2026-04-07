import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_secret_32_chars_long_12345');

export async function GET(req: NextRequest) {
  try {
    const admins = await prisma.admin.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, email: true, name: true, role: true, updatedAt: true }
    });
    return NextResponse.json({ admins });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch admins' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    // Only Superadmin can change roles
    const token = req.cookies.get('admin_session')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const id = req.nextUrl.pathname.split('/').pop();
    const { role } = await req.json();

    const updated = await prisma.admin.update({
      where: { id },
      data: { role }
    });

    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}
