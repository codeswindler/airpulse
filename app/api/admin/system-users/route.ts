import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';

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

export async function GET(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const admins = await prisma.admin.findMany({
      orderBy: { createdAt: 'desc' },
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
    return NextResponse.json({ admins });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch admins' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth || auth.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
  }

  try {
    const { name, email, password, role, businessId } = await req.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const exists = await prisma.admin.findUnique({ where: { email } });
    if (exists) {
      return NextResponse.json({ error: 'Admin with this email already exists' }, { status: 400 });
    }

    if (businessId) {
      const business = await prisma.business.findUnique({ where: { id: businessId } });
      if (!business) {
        return NextResponse.json({ error: 'Selected business does not exist' }, { status: 400 });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdmin = await prisma.admin.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || (businessId ? 'BUSINESS_STAFF' : 'MODERATOR'),
        businessId: businessId || null,
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

    return NextResponse.json(newAdmin, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: 'Creation failed' }, { status: 500 });
  }
}
