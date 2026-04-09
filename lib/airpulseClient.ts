import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from './prisma';

const baseUrl = 'https://api.tupay.africa/v1';

let cachedToken = '';
let tokenExpiry = 0;
let cachedBalance: { amount: number; currency: string } | null = null;
let balanceExpiry = 0;
const BALANCE_CACHE_TTL = 60 * 1000;

type AirPulseConfig = {
  apiKey?: string;
  businessName?: string;
  secret?: string;
  uuid?: string;
};

function firstNonEmpty(...values: Array<string | undefined | null>) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim() !== '') {
      return value.trim();
    }
  }

  return undefined;
}

async function getAirPulseConfig(): Promise<AirPulseConfig> {
  const envConfig: AirPulseConfig = {
    uuid: firstNonEmpty(process.env.AIRPULSE_CONSUMER_UUID, process.env.AIRPULSE_UUID),
    apiKey: firstNonEmpty(process.env.AIRPULSE_API_KEY),
    secret: firstNonEmpty(process.env.AIRPULSE_SIGNING_SECRET, process.env.AIRPULSE_SECRET),
    businessName: firstNonEmpty(process.env.AIRPULSE_BUSINESS_NAME),
  };

  if (envConfig.uuid && envConfig.apiKey && envConfig.secret && envConfig.businessName) {
    return envConfig;
  }

  const settings = await prisma.systemSetting.findMany({
    where: {
      key: {
        in: ['airpulse_uuid', 'airpulse_api_key', 'airpulse_secret', 'airpulse_business_name'],
      },
    },
  });

  const settingMap = new Map(settings.map((setting) => [setting.key, setting.value]));

  return {
    uuid: envConfig.uuid ?? firstNonEmpty(settingMap.get('airpulse_uuid')),
    apiKey: envConfig.apiKey ?? firstNonEmpty(settingMap.get('airpulse_api_key')),
    secret: envConfig.secret ?? firstNonEmpty(settingMap.get('airpulse_secret')),
    businessName: envConfig.businessName ?? firstNonEmpty(settingMap.get('airpulse_business_name')),
  };
}

export async function getAirPulseToken(config?: AirPulseConfig) {
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const resolvedConfig = config ?? await getAirPulseConfig();
  const authStrategies = [
    resolvedConfig.apiKey && resolvedConfig.secret
      ? {
          auth: Buffer.from(`${resolvedConfig.apiKey}:${resolvedConfig.secret}`).toString('base64'),
          endpoint: '/bus/token',
        }
      : null,
    resolvedConfig.uuid && resolvedConfig.apiKey
      ? {
          auth: Buffer.from(`${resolvedConfig.uuid}:${resolvedConfig.apiKey}`).toString('base64'),
          endpoint: '/token',
        }
      : null,
  ].filter((strategy): strategy is { auth: string; endpoint: string } => Boolean(strategy));

  if (authStrategies.length === 0) {
    throw new Error('Missing AirPulse Credentials');
  }

  let lastError: unknown;

  for (const strategy of authStrategies) {
    try {
      const response = await axios.post(`${baseUrl}${strategy.endpoint}`, {}, {
        headers: {
          Authorization: `Basic ${strategy.auth}`,
        },
      });

      cachedToken = response.data.access_token;
      tokenExpiry = Date.now() + Math.max((response.data.expires_in ?? 3600) - 60, 60) * 1000;
      return cachedToken;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error('Unable to authenticate with Tupay');
}

export function clearAirPulseTokenCache() {
  cachedToken = '';
  tokenExpiry = 0;
}

export function clearTupayBalanceCache() {
  cachedBalance = null;
  balanceExpiry = 0;
}

export async function buyAirtimeFromBalance(targetPhone: string, amount: number, reference: string) {
  const config = await getAirPulseConfig();
  const token = await getAirPulseToken(config);
  const account = cleanPhone(targetPhone);
  const service = getNetwork(targetPhone);
  const idempotencyKey = uuidv4();
  const attempts = [
    {
      endpoint: `/bus/order/${service}`,
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
      body: {
        account,
        amount,
        currency: 'KES',
        reference,
      },
    },
    {
      endpoint: '/airtime',
      headers: {},
      body: {
        service,
        account,
        amount,
        currency: 'KES',
        reference,
        idempotencyKey,
      },
    },
  ];

  let lastError: unknown;

  for (const attempt of attempts) {
    try {
      const response = await axios.post(`${baseUrl}${attempt.endpoint}`, attempt.body, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...attempt.headers,
        },
      });

      return response.data;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error('Unable to fulfill airtime with Tupay');
}

export async function getTupayBalance() {
  const now = Date.now();
  if (cachedBalance && now < balanceExpiry) {
    return cachedBalance;
  }

  const config = await getAirPulseConfig();
  const token = await getAirPulseToken(config);
  const attempts = ['/balance', '/b2b/balance'];
  let lastError: unknown;

  for (const endpoint of attempts) {
    try {
      const response = await axios.get(`${baseUrl}${endpoint}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const rawStatus = response.data?.status ?? response.data?.Status;
      const numericStatus = rawStatus !== undefined ? Number(rawStatus) : response.status;
      if (![20, 200].includes(numericStatus)) {
        throw new Error(`Unexpected Tupay balance status: ${rawStatus}`);
      }

      const amount = Number(response.data?.amount ?? response.data?.Amount);
      const currency = String(response.data?.currency ?? response.data?.Currency ?? 'KES').trim() || 'KES';

      if (!Number.isFinite(amount)) {
        throw new Error('Tupay balance response missing amount');
      }

      cachedBalance = { amount, currency };
      balanceExpiry = now + BALANCE_CACHE_TTL;
      return cachedBalance;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error('Unable to fetch Tupay balance');
}

export function isTupaySuccessStatus(status: unknown) {
  return [20, 200].includes(Number(status));
}

export function isTupayPendingStatus(status: unknown) {
  return [0, 3, 31, 100, 101].includes(Number(status));
}

export async function getTupayTransactionStatus(transactionId: string) {
  const config = await getAirPulseConfig();
  const token = await getAirPulseToken(config);
  const attempts = [`/status/${encodeURIComponent(transactionId)}`, `/b2b/status/${encodeURIComponent(transactionId)}`];
  let lastError: unknown;

  for (const endpoint of attempts) {
    try {
      const response = await axios.get(`${baseUrl}${endpoint}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.data;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error('Unable to fetch Tupay transaction status');
}

function cleanPhone(phone: string) {
  // Ensure starts with 254
  let p = phone.trim();
  if (p.startsWith('+')) p = p.slice(1);
  if (p.startsWith('0')) p = '254' + p.slice(1);
  if (/^(7|1)\d{8}$/.test(p)) p = '254' + p;
  return p;
}

function getNetwork(phone: string) {
  // Simple heuristic, real implementation requires HLR lookup or strict prefix mapping
  const p = cleanPhone(phone);
  if (p.match(/^254(70|71|72|79|74|11)/)) return 'safaricom';
  if (p.match(/^254(73|78)/)) return 'airtel';
  if (p.match(/^254(77)/)) return 'telkom';
  return 'safaricom'; // Default
}
