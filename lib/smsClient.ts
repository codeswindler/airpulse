import { prisma } from './prisma';
import axios from 'axios';
import { getBusinessIntegrationSnapshot } from './businessIntegrations';

// Cache in-memory for 5 minutes, keyed by business context.
const cachedBalance = new Map<string, { value: number; fetchedAt: number }>();
const CACHE_TTL = 5 * 60 * 1000;
const DEFAULT_ADVANTA_BASE_URL = 'https://quicksms.advantasms.com';

export function clearSmsBalanceCache(businessId?: string | null) {
  if (businessId) {
    cachedBalance.delete(businessId.trim() || 'global');
    return;
  }

  cachedBalance.clear();
}

type SmsProvider = 'advanta' | 'onfon';

type SmsSettings = {
  businessName: string;
  provider?: SmsProvider;
  advantaBaseUrl?: string;
  advantaApiKey?: string;
  advantaPartnerId?: string;
  advantaSenderId?: string;
  onfonAccessKey?: string;
  onfonApiKey?: string;
  onfonClientId?: string;
  onfonSenderId?: string;
};

type AirtimeNotificationStage = 'pending' | 'delivered' | 'failed';

function firstNonEmpty(...values: Array<string | undefined | null>) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim() !== '') {
      return value.trim();
    }
  }

  return undefined;
}

function cleanPhone(phone: string) {
  let normalized = phone.trim();

  if (normalized.startsWith('+')) {
    normalized = normalized.slice(1);
  }

  if (normalized.startsWith('0')) {
    normalized = `254${normalized.slice(1)}`;
  }

  if (/^(7|1)\d{8}$/.test(normalized)) {
    normalized = `254${normalized}`;
  }

  return normalized;
}

function formatAmount(amount: number) {
  return Number.isInteger(amount) ? amount.toString() : amount.toFixed(2);
}

function buildAdvantaUrl(baseUrl: string | undefined, path: string) {
  const normalizedBase = firstNonEmpty(baseUrl, DEFAULT_ADVANTA_BASE_URL) || DEFAULT_ADVANTA_BASE_URL;
  const joinedBase = normalizedBase.endsWith('/') ? normalizedBase : `${normalizedBase}/`;
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
  return new URL(normalizedPath, joinedBase).toString();
}

async function getSmsSettings(businessId?: string | null): Promise<SmsSettings> {
  const business = await getBusinessIntegrationSnapshot(businessId);
  const settings = await prisma.systemSetting.findMany();
  const find = (key: string) => settings.find((setting) => setting.key === key)?.value;

  return {
    provider: (firstNonEmpty(business?.smsProvider, find('sms_provider')) as SmsProvider | undefined),
    businessName: firstNonEmpty(business?.name, find('airpulse_business_name')) ?? 'AirPulse',
    advantaBaseUrl: firstNonEmpty(find('advanta_base_url'), process.env.ADVANTA_BASE_URL, DEFAULT_ADVANTA_BASE_URL),
    advantaApiKey: firstNonEmpty(find('advanta_api_key'), business?.smsApiKey),
    advantaPartnerId: firstNonEmpty(find('advanta_partner_id'), business?.smsPartnerId),
    advantaSenderId: firstNonEmpty(find('advanta_sender_id'), business?.smsSenderId),
    onfonAccessKey: firstNonEmpty(find('onfon_access_key'), business?.smsAccessKey),
    onfonApiKey: firstNonEmpty(find('onfon_api_key'), business?.smsApiKey),
    onfonClientId: firstNonEmpty(find('onfon_client_id'), business?.smsClientId),
    onfonSenderId: firstNonEmpty(find('onfon_sender_id'), business?.smsSenderId),
  };
}

async function fetchSmsBalance(businessId?: string | null) {
  const settings = await getSmsSettings(businessId);
  const provider = settings.provider;

  if (provider === 'advanta') {
    const apiKey = settings.advantaApiKey;
    const partnerId = settings.advantaPartnerId;

    if (!apiKey || !partnerId) {
      throw new Error('Advanta SMS credentials incomplete');
    }

    const response = await axios.post(buildAdvantaUrl(settings.advantaBaseUrl, '/api/services/getbalance'), {
      apikey: apiKey,
      partnerID: partnerId,
    });

    if (response.data?.['response-code'] !== 200) {
      throw new Error(response.data?.['response-description'] || 'Advanta balance lookup failed');
    }

    return parseFloat(String(response.data.credit || '0'));
  }

  if (provider === 'onfon') {
    const apiKey = settings.onfonApiKey;
    const clientId = settings.onfonClientId;
    const accessKey = settings.onfonAccessKey;

    if (!apiKey || !clientId || !accessKey) {
      throw new Error('Onfon SMS credentials incomplete');
    }

    const response = await axios.get('https://api.onfonmedia.co.ke/v1/sms/Balance', {
      params: { ApiKey: apiKey, ClientId: clientId },
      headers: { AccessKey: accessKey },
    });

    if (response.data?.ErrorCode !== 0 || !response.data.Data?.[0]) {
      throw new Error(response.data?.ErrorDescription || 'Onfon balance lookup failed');
    }

    const creditStr = response.data.Data[0].Credits || '0';
    return parseFloat(String(creditStr).replace(/[^0-9.]/g, ''));
  }

  throw new Error('No SMS provider configured');
}

export async function sendSms(phoneNumber: string, message: string, businessId?: string | null) {
  const settings = await getSmsSettings(businessId);
  const provider = settings.provider;
  const mobile = cleanPhone(phoneNumber);

  if (!provider) {
    console.warn('[SMS] No SMS provider configured; skipping notification');
    return null;
  }

  if (provider === 'advanta') {
    if (!settings.advantaApiKey || !settings.advantaPartnerId || !settings.advantaSenderId) {
      console.warn('[SMS] Advanta credentials incomplete; skipping notification');
      return null;
    }

    const response = await axios.post(buildAdvantaUrl(settings.advantaBaseUrl, '/api/services/sendsms'), {
      apikey: settings.advantaApiKey,
      partnerID: settings.advantaPartnerId,
      message,
      mobile,
      shortcode: settings.advantaSenderId,
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const firstResponse = response.data?.responses?.[0];
    if (firstResponse?.['response-code'] === 200 || response.data?.['response-code'] === 200) {
      return {
        messageId: firstResponse?.messageid ? String(firstResponse.messageid) : undefined,
        provider,
      };
    }

    throw new Error(response.data?.['response-description'] || 'Advanta SMS send failed');
  }

  if (!settings.onfonApiKey || !settings.onfonClientId || !settings.onfonAccessKey || !settings.onfonSenderId) {
    console.warn('[SMS] Onfon credentials incomplete; skipping notification');
    return null;
  }

  const response = await axios.post('https://api.onfonmedia.co.ke/v1/sms/SendBulkSMS', {
    ApiKey: settings.onfonApiKey,
    ClientId: settings.onfonClientId,
    SenderId: settings.onfonSenderId,
    IsFlash: false,
    IsUnicode: false,
    MessageParameters: [
      {
        Number: mobile,
        Text: message,
      },
    ],
  }, {
    headers: {
      'AccessKey': settings.onfonAccessKey,
      'Content-Type': 'application/json',
    },
  });

  if (response.data?.ErrorCode === 0) {
    return {
      messageId: response.data?.Data?.[0]?.MessageId ? String(response.data.Data[0].MessageId) : undefined,
      provider,
    };
  }

  throw new Error(response.data?.ErrorDescription || 'Onfon SMS send failed');
}

export async function sendAirtimeNotification(params: {
  amount: number;
  payerPhone: string;
  stage: AirtimeNotificationStage;
  targetPhone: string;
  transactionId: string;
  businessId?: string | null;
}) {
  const settings = await getSmsSettings(params.businessId);
  const amountText = formatAmount(params.amount);
  const businessName = settings.businessName;
  let message = '';

  if (params.stage === 'delivered') {
    message = `${businessName}: Airtime worth KES ${amountText} was sent to ${cleanPhone(params.targetPhone)}. Ref ${params.transactionId}.`;
  } else if (params.stage === 'pending') {
    message = `${businessName}: Airtime worth KES ${amountText} to ${cleanPhone(params.targetPhone)} is being processed. Ref ${params.transactionId}.`;
  } else {
    message = `${businessName}: Airtime request of KES ${amountText} to ${cleanPhone(params.targetPhone)} failed. Ref ${params.transactionId}.`;
  }

  const result = await sendSms(params.payerPhone, message, params.businessId);

  if (result) {
    console.log('[SMS] Airtime notification sent', {
      messageId: result.messageId ?? 'missing',
      provider: result.provider,
      stage: params.stage,
      transactionId: params.transactionId,
    });
  }

  return result;
}

export async function getSmsBalance(businessId?: string | null) {
  const now = Date.now();
  const cacheKey = businessId?.trim() || 'global';
  const cached = cachedBalance.get(cacheKey);
  if (cached && (now - cached.fetchedAt < CACHE_TTL)) {
    return cached.value;
  }

  try {
    const balance = await fetchSmsBalance(businessId);
    cachedBalance.set(cacheKey, { value: balance, fetchedAt: now });
    return balance;

  } catch (error) {
    console.error('Fetch SMS Balance Error:', error);
    return cached?.value ?? 0;
  }
}

export async function checkSmsConnection(businessId?: string | null) {
  try {
    await fetchSmsBalance(businessId);
    return true;
  } catch (error) {
    console.warn('[SMS] Connection probe failed', error);
    return false;
  }
}
