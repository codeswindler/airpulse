import nodemailer from 'nodemailer';
import { prisma } from './prisma';

type EmailSecureMode = 'tls' | 'ssl' | 'off';

type EmailSettings = {
  smtpEnabled: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  smtpSecure: EmailSecureMode;
  smtpFromEmail: string;
  smtpFromName: string;
};

type EmailMessage = {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
};

function getSettingValue(settings: Array<{ key: string; value: string }>, key: string, fallback = '') {
  return settings.find((setting) => setting.key === key)?.value ?? fallback;
}

function parsePort(value: string, fallback = 587) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseSecure(value: string): EmailSecureMode {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'ssl') return 'ssl';
  if (normalized === 'off') return 'off';
  return 'tls';
}

export async function getPlatformEmailSettings(): Promise<EmailSettings> {
  const settings = await prisma.systemSetting.findMany();

  return {
    smtpEnabled: getSettingValue(settings, 'smtp_enabled', 'true') === 'true',
    smtpHost: getSettingValue(settings, 'smtp_host'),
    smtpPort: parsePort(getSettingValue(settings, 'smtp_port', '587')),
    smtpUser: getSettingValue(settings, 'smtp_user'),
    smtpPass: getSettingValue(settings, 'smtp_pass'),
    smtpSecure: parseSecure(getSettingValue(settings, 'smtp_secure', 'tls')),
    smtpFromEmail: getSettingValue(settings, 'smtp_from_email'),
    smtpFromName: getSettingValue(settings, 'smtp_from_name', 'AirPulse'),
  };
}

export function canSendEmail(settings: EmailSettings) {
  return Boolean(
    settings.smtpEnabled &&
    settings.smtpHost &&
    settings.smtpPort &&
    settings.smtpUser &&
    settings.smtpPass &&
    settings.smtpFromEmail
  );
}

export async function sendEmail(message: EmailMessage) {
  const settings = await getPlatformEmailSettings();

  if (!canSendEmail(settings)) {
    return null;
  }

  const transportOptions = {
    host: settings.smtpHost,
    port: settings.smtpPort,
    secure: settings.smtpSecure === 'ssl',
    auth: {
      user: settings.smtpUser,
      pass: settings.smtpPass,
    },
    requireTLS: settings.smtpSecure === 'tls',
  };

  const transporter = nodemailer.createTransport(transportOptions);
  const from = settings.smtpFromName
    ? `${settings.smtpFromName} <${settings.smtpFromEmail}>`
    : settings.smtpFromEmail;

  const info = await transporter.sendMail({
    from,
    to: message.to,
    subject: message.subject,
    text: message.text,
    html: message.html,
    replyTo: message.replyTo,
  });

  return {
    messageId: info.messageId,
    provider: 'smtp' as const,
  };
}
