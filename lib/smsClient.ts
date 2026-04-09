import { prisma } from './prisma';
import axios from 'axios';

// Cache in-memory for 5 minutes
let cachedBalance: number | null = null;
let lastFetched: number = 0;
const CACHE_TTL = 5 * 60 * 1000;

export function clearSmsBalanceCache() {
  cachedBalance = null;
  lastFetched = 0;
}

type SmsProvider = 'advanta' | 'onfon';

type SmsSettings = {
  businessName: string;
  provider?: SmsProvider;
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

async function getSmsSettings(): Promise<SmsSettings> {
  const settings = await prisma.systemSetting.findMany();
  const find = (key: string) => settings.find((setting) => setting.key === key)?.value;

  return {
    provider: firstNonEmpty(find('sms_provider')) as SmsProvider | undefined,
    businessName: firstNonEmpty(find('airpulse_business_name')) ?? 'AirPulse',
    advantaApiKey: firstNonEmpty(find('advanta_api_key')),
    advantaPartnerId: firstNonEmpty(find('advanta_partner_id')),
    advantaSenderId: firstNonEmpty(find('advanta_sender_id')),
    onfonAccessKey: firstNonEmpty(find('onfon_access_key')),
    onfonApiKey: firstNonEmpty(find('onfon_api_key')),
    onfonClientId: firstNonEmpty(find('onfon_client_id')),
    onfonSenderId: firstNonEmpty(find('onfon_sender_id')),
  };
}

export async function sendSms(phoneNumber: string, message: string) {
  const settings = await getSmsSettings();
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

    const response = await axios.post('https://quicksms.advantasms.com/api/services/sendsms', {
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
}) {
  const settings = await getSmsSettings();
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

  const result = await sendSms(params.payerPhone, message);

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

export async function getSmsBalance() {
  const now = Date.now();
  if (cachedBalance !== null && (now - lastFetched < CACHE_TTL)) {
    return cachedBalance;
  }

  try {
    const settings = await prisma.systemSetting.findMany();
    const find = (key: string) => settings.find(s => s.key === key)?.value;

    const provider = find('sms_provider');

    if (provider === 'advanta') {
      const apiKey = find('advanta_api_key');
      const partnerId = find('advanta_partner_id');
      if (apiKey && partnerId) {
        // Advanta balance fetch
        const res = await axios.post('https://quicksms.advantasms.com/api/services/getbalance', {
          apikey: apiKey,
          partnerID: partnerId
        });
        if (res.data?.['response-code'] === 200) {
          cachedBalance = parseFloat(res.data.credit || '0');
          lastFetched = now;
          return cachedBalance;
        }
      }
    } else if (provider === 'onfon') {
      const apiKey = find('onfon_api_key');
      const clientId = find('onfon_client_id');
      const accessKey = find('onfon_access_key');
      if (apiKey && clientId && accessKey) {
        // Onfon balance fetch
        const res = await axios.get('https://api.onfonmedia.co.ke/v1/sms/Balance', {
          params: { ApiKey: apiKey, ClientId: clientId },
          headers: { 'AccessKey': accessKey }
        });
        if (res.data?.ErrorCode === 0 && res.data.Data?.[0]) {
          const creditStr = res.data.Data[0].Credits || '0';
          cachedBalance = parseFloat(creditStr.replace(/[^0-9.]/g, ''));
          lastFetched = now;
          return cachedBalance;
        }
      }
    }
    
    // Fallback if not configured
    return 0;

  } catch (error) {
    console.error('Fetch SMS Balance Error:', error);
    return cachedBalance ?? 0;
  }
}
