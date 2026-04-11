import bcrypt from 'bcryptjs';
import { randomInt } from 'crypto';
import { SignJWT, jwtVerify } from 'jose';
import { prisma } from './prisma';
import { sendEmail } from './emailClient';
import { sendSms } from './smsClient';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_secret_32_chars_long_12345');
const OTP_EXPIRY_MINUTES = 10;
const OTP_ATTEMPT_LIMIT = 5;

type LoginOtpAdmin = {
  id: string;
  email: string;
  name: string | null;
  phoneNumber: string | null;
  role: string;
  businessId: string | null;
  business?: {
    name: string;
    slug: string;
  } | null;
};

type ChallengePayload = {
  otpId: string;
  adminId: string;
  purpose: 'LOGIN_OTP';
};

type LoginOtpResult = {
  challengeToken: string;
  delivery: {
    email: boolean;
    sms: boolean;
  };
  expiresAt: string;
};

function generateCode() {
  return randomInt(100000, 1000000).toString();
}

function maskEmail(email: string) {
  const [local, domain] = email.split('@');
  if (!local || !domain) {
    return email;
  }

  const visible = local.slice(0, 2);
  return `${visible}${local.length > 2 ? '***' : ''}@${domain}`;
}

function maskPhone(phone: string) {
  const digits = phone.replace(/[^0-9]/g, '');
  if (digits.length <= 4) {
    return digits;
  }

  return `${digits.slice(0, 3)}***${digits.slice(-3)}`;
}

async function issueChallengeToken(payload: ChallengePayload, expiresAt: Date) {
  return new SignJWT({
    otpId: payload.otpId,
    adminId: payload.adminId,
    purpose: payload.purpose,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(JWT_SECRET);
}

export async function sendLoginOtp(admin: LoginOtpAdmin): Promise<LoginOtpResult> {
  const code = generateCode();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
  const codeHash = await bcrypt.hash(code, 10);

  const otp = await prisma.loginOtp.create({
    data: {
      adminId: admin.id,
      codeHash,
      expiresAt,
      sentToEmail: admin.email,
      sentToPhone: admin.phoneNumber || null,
    },
  });

  const loginSubject = 'AirPulse login code';
  const loginText = `Your AirPulse login code is ${code}. It expires in ${OTP_EXPIRY_MINUTES} minutes. Do not share this code.`;
  const delivery = { email: false, sms: false };

  const emailAttempt = admin.email
    ? sendEmail({
        to: admin.email,
        subject: loginSubject,
        text: loginText,
        html: `<p>Your AirPulse login code is <strong>${code}</strong>.</p><p>It expires in ${OTP_EXPIRY_MINUTES} minutes. Do not share this code.</p>`,
      })
    : Promise.resolve(null);

  const smsAttempt = admin.phoneNumber
    ? sendSms(admin.phoneNumber, `AirPulse: your login code is ${code}. It expires in ${OTP_EXPIRY_MINUTES} minutes. Do not share it.`)
    : Promise.resolve(null);

  const [emailResult, smsResult] = await Promise.allSettled([emailAttempt, smsAttempt]);

  if (emailResult.status === 'fulfilled' && emailResult.value) {
    delivery.email = true;
  }

  if (smsResult.status === 'fulfilled' && smsResult.value) {
    delivery.sms = true;
  }

  if (!delivery.email && !delivery.sms) {
    await prisma.loginOtp.delete({ where: { id: otp.id } });
    throw new Error('No OTP delivery channel is configured for this account');
  }

  const challengeToken = await issueChallengeToken(
    {
      otpId: otp.id,
      adminId: admin.id,
      purpose: 'LOGIN_OTP',
    },
    expiresAt,
  );

  return {
    challengeToken,
    delivery,
    expiresAt: expiresAt.toISOString(),
  };
}

export async function verifyLoginOtp(challengeToken: string, code: string) {
  const { payload } = await jwtVerify(challengeToken, JWT_SECRET);

  if (payload.purpose !== 'LOGIN_OTP') {
    throw new Error('Invalid OTP challenge');
  }

  const otpId = typeof payload.otpId === 'string' ? payload.otpId : '';
  const adminId = typeof payload.adminId === 'string' ? payload.adminId : '';

  if (!otpId || !adminId) {
    throw new Error('Invalid OTP challenge');
  }

  const otp = await prisma.loginOtp.findUnique({
    where: { id: otpId },
  });

  if (!otp || otp.adminId !== adminId) {
    throw new Error('OTP challenge not found');
  }

  if (otp.consumedAt) {
    throw new Error('OTP has already been used');
  }

  if (otp.expiresAt.getTime() < Date.now()) {
    throw new Error('OTP has expired');
  }

  if (otp.attempts >= OTP_ATTEMPT_LIMIT) {
    throw new Error('Too many incorrect OTP attempts');
  }

  const matches = await bcrypt.compare(code.trim(), otp.codeHash);

  if (!matches) {
    await prisma.loginOtp.update({
      where: { id: otp.id },
      data: {
        attempts: { increment: 1 },
      },
    });

    throw new Error('Invalid OTP code');
  }

  const admin = await prisma.admin.findUnique({
    where: { id: adminId },
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
    throw new Error('Admin account not found');
  }

  await prisma.loginOtp.update({
    where: { id: otp.id },
    data: {
      consumedAt: new Date(),
    },
  });

  return {
    admin,
    otpId: otp.id,
    delivery: {
      email: Boolean(otp.sentToEmail),
      sms: Boolean(otp.sentToPhone),
    },
  };
}

export function maskOtpEmail(email: string) {
  return maskEmail(email);
}

export function maskOtpPhone(phone: string) {
  return maskPhone(phone);
}
