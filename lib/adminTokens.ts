import { SignJWT } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_secret_32_chars_long_12345');

export type AdminTokenPayload = {
  id: string;
  email: string;
  role: string;
  name: string | null;
  businessId: string | null;
  phoneNumber?: string | null;
};

export async function issueAdminToken(admin: AdminTokenPayload) {
  return new SignJWT({
    id: admin.id,
    email: admin.email,
    role: admin.role,
    name: admin.name,
    businessId: admin.businessId,
    phoneNumber: admin.phoneNumber ?? null,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET);
}
