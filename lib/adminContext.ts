import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { prisma } from './prisma';
import { BUSINESS_CONTEXT_COOKIE } from './businessContext';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_secret_32_chars_long_12345');

export type AdminSession = {
  id?: string;
  email?: string;
  role?: string;
  businessId?: string | null;
  name?: string;
};

async function verifyToken(token: string): Promise<AdminSession | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as AdminSession;
  } catch {
    return null;
  }
}

export async function getAdminSessionFromCookies() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_session')?.value;

  if (!token) {
    return null;
  }

  return verifyToken(token);
}

export async function resolveAdminContextFromCookies(defaultBusinessId: string | null = null) {
  const cookieStore = await cookies();
  const admin = await getAdminSessionFromCookies();
  const cookieBusinessId = cookieStore.get(BUSINESS_CONTEXT_COOKIE)?.value?.trim() || null;
  const cookieBusiness = cookieBusinessId
    ? await prisma.business.findUnique({
        where: { id: cookieBusinessId },
        select: { id: true },
      })
    : null;
  const fallbackBusiness = admin?.role === 'SUPERADMIN' && !cookieBusinessId && !admin?.businessId
    ? await prisma.business.findFirst({
        where: { status: 'ACTIVE' },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      })
    : null;
  const selectedBusinessId = admin?.role === 'SUPERADMIN'
    ? (cookieBusiness?.id || admin?.businessId || fallbackBusiness?.id || defaultBusinessId)
    : (admin?.businessId || defaultBusinessId);

  return {
    admin,
    selectedBusinessId: selectedBusinessId || null,
  };
}

export async function getAdminSessionFromRequest(req: NextRequest) {
  const token = req.cookies.get('admin_session')?.value;

  if (!token) {
    return null;
  }

  return verifyToken(token);
}

export async function getSelectedBusinessIdFromRequest(
  req: NextRequest,
  defaultBusinessId: string | null = null,
  auth: AdminSession | null = null,
) {
  if (auth?.role && auth.role !== 'SUPERADMIN') {
    return auth.businessId || defaultBusinessId;
  }

  const selectedBusinessId = req.cookies.get(BUSINESS_CONTEXT_COOKIE)?.value?.trim();

  if (selectedBusinessId) {
    return selectedBusinessId;
  }

  if (defaultBusinessId) {
    return defaultBusinessId;
  }

  const fallbackBusiness = await prisma.business.findFirst({
    where: { status: 'ACTIVE' },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });

  return fallbackBusiness?.id ?? null;
}
