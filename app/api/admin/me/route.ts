import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jwtVerify } from 'jose';

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

    return NextResponse.json({
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      businessId: admin.businessId,
      business: admin.business,
    });
  } catch (err) {
    return NextResponse.json({ error: 'Invalid Session' }, { status: 401 });
  }
}
