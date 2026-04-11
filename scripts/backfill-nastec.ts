import { prisma } from '../lib/prisma';

const BUSINESS_NAME = 'NASTEC TECHNOLOGIES';
const BUSINESS_SLUG = 'nastec-technologies';

function firstNonEmpty(...values: Array<string | undefined | null>) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim() !== '') {
      return value.trim();
    }
  }

  return undefined;
}

function toNullableString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

async function main() {
  const dryRun = ['1', 'true', 'yes'].includes((process.env.DRY_RUN || '').toLowerCase());

  const existingBusiness = await prisma.business.findFirst({
    where: {
      OR: [
        { slug: BUSINESS_SLUG },
        { name: BUSINESS_NAME },
      ],
    },
  });

  const settings = await prisma.systemSetting.findMany();
  const settingMap = new Map(settings.map((setting) => [setting.key, setting.value]));
  const appUrl = process.env.APP_URL?.trim();
  const sharedCallbackUrl = appUrl ? `${appUrl}/api/mpesa/callback` : undefined;

  const nextValues = {
    name: BUSINESS_NAME,
    serviceCode: firstNonEmpty(existingBusiness?.serviceCode, settingMap.get('ussd_service_code'), settingMap.get('service_code')),
    mpesaConsumerKey: firstNonEmpty(
      existingBusiness?.mpesaConsumerKey,
      settingMap.get('mpesa_consumer_key'),
      settingMap.get('mpesaConsumerKey'),
      process.env.MPESA_CONSUMER_KEY,
    ),
    mpesaConsumerSecret: firstNonEmpty(
      existingBusiness?.mpesaConsumerSecret,
      settingMap.get('mpesa_consumer_secret'),
      settingMap.get('mpesaConsumerSecret'),
      process.env.MPESA_CONSUMER_SECRET,
    ),
    mpesaPasskey: firstNonEmpty(
      existingBusiness?.mpesaPasskey,
      settingMap.get('mpesa_passkey'),
      settingMap.get('mpesaPasskey'),
      process.env.MPESA_PASSKEY,
    ),
    mpesaShortcode: firstNonEmpty(
      existingBusiness?.mpesaShortcode,
      settingMap.get('mpesa_shortcode'),
      settingMap.get('mpesaShortcode'),
      process.env.MPESA_SHORTCODE,
    ),
    mpesaBusinessShortcode: firstNonEmpty(
      existingBusiness?.mpesaBusinessShortcode,
      settingMap.get('mpesa_business_shortcode'),
      settingMap.get('mpesaBusinessShortcode'),
      process.env.MPESA_BUSINESS_SHORTCODE,
    ),
    mpesaPartyB: firstNonEmpty(
      existingBusiness?.mpesaPartyB,
      settingMap.get('mpesa_partyb'),
      settingMap.get('mpesa_party_b'),
      settingMap.get('mpesaPartyB'),
      process.env.MPESA_PARTYB,
    ),
    mpesaEnvironment: firstNonEmpty(
      existingBusiness?.mpesaEnvironment,
      settingMap.get('mpesa_environment'),
      settingMap.get('mpesaEnvironment'),
      process.env.MPESA_ENV,
    ) || 'production',
    mpesaTransactionType: firstNonEmpty(
      existingBusiness?.mpesaTransactionType,
      settingMap.get('mpesa_transaction_type'),
      settingMap.get('mpesaTransactionType'),
      process.env.MPESA_TRANSACTION_TYPE,
    ) || 'CustomerBuyGoodsOnline',
    mpesaCallbackUrl: firstNonEmpty(
      existingBusiness?.mpesaCallbackUrl,
      settingMap.get('mpesa_callback_url'),
      settingMap.get('mpesaCallbackUrl'),
      process.env.MPESA_CALLBACK_URL,
      sharedCallbackUrl,
    ),
    tupayUuid: firstNonEmpty(
      existingBusiness?.tupayUuid,
      settingMap.get('airpulse_uuid'),
      settingMap.get('tupay_uuid'),
      settingMap.get('tupayUuid'),
      process.env.AIRPULSE_CONSUMER_UUID,
      process.env.AIRPULSE_UUID,
    ),
    tupayApiKey: firstNonEmpty(
      existingBusiness?.tupayApiKey,
      settingMap.get('airpulse_api_key'),
      settingMap.get('tupay_api_key'),
      settingMap.get('tupayApiKey'),
      process.env.AIRPULSE_API_KEY,
    ),
    tupaySecret: firstNonEmpty(
      existingBusiness?.tupaySecret,
      settingMap.get('airpulse_secret'),
      settingMap.get('tupay_secret'),
      settingMap.get('tupaySecret'),
      process.env.AIRPULSE_SIGNING_SECRET,
      process.env.AIRPULSE_SECRET,
    ),
    smsProvider: firstNonEmpty(
      existingBusiness?.smsProvider,
      settingMap.get('sms_provider'),
      settingMap.get('smsProvider'),
      process.env.SMS_PROVIDER,
    ),
    smsPartnerId: firstNonEmpty(
      existingBusiness?.smsPartnerId,
      settingMap.get('advanta_partner_id'),
      settingMap.get('sms_partner_id'),
      process.env.ADVANTA_PARTNER_ID,
    ),
    smsApiKey: firstNonEmpty(
      existingBusiness?.smsApiKey,
      settingMap.get('advanta_api_key'),
      settingMap.get('onfon_api_key'),
      settingMap.get('sms_api_key'),
      process.env.ADVANTA_API_KEY,
      process.env.ONFON_API_KEY,
    ),
    smsSenderId: firstNonEmpty(
      existingBusiness?.smsSenderId,
      settingMap.get('advanta_sender_id'),
      settingMap.get('onfon_sender_id'),
      settingMap.get('sms_sender_id'),
      process.env.ADVANTA_SENDER_ID,
      process.env.ONFON_SENDER_ID,
    ),
    smsAccessKey: firstNonEmpty(
      existingBusiness?.smsAccessKey,
      settingMap.get('onfon_access_key'),
      settingMap.get('sms_access_key'),
      process.env.ONFON_ACCESS_KEY,
    ),
    smsClientId: firstNonEmpty(
      existingBusiness?.smsClientId,
      settingMap.get('onfon_client_id'),
      settingMap.get('sms_client_id'),
      process.env.ONFON_CLIENT_ID,
    ),
    ownerName: firstNonEmpty(existingBusiness?.ownerName, BUSINESS_NAME),
    ownerEmail: firstNonEmpty(existingBusiness?.ownerEmail),
  };

  const businessUpdates = Object.fromEntries(
    Object.entries(nextValues)
      .filter(([key, value]) => {
        if (key === 'name') {
          return false;
        }

        const currentValue = (existingBusiness as Record<string, unknown> | null)?.[key];
        if (typeof currentValue === 'string' && currentValue.trim()) {
          return false;
        }

        return typeof value === 'string' && value.trim() !== '';
      })
      .map(([key, value]) => [key, toNullableString(value)]),
  ) as Record<string, string | null>;

  const hasBusinessUpdates = Object.keys(businessUpdates).length > 0;

  if (dryRun) {
    console.log('[NASTEC BACKFILL] Dry run only');
    console.log(JSON.stringify({
      businessId: existingBusiness?.id || 'new-business',
      updates: businessUpdates,
    }, null, 2));
    await prisma.$disconnect();
    return;
  }

  let business = existingBusiness;

  if (!business) {
    business = await prisma.business.create({
      data: {
        name: BUSINESS_NAME,
        slug: BUSINESS_SLUG,
        status: 'ACTIVE',
        ownerName: nextValues.ownerName ?? BUSINESS_NAME,
        ownerEmail: nextValues.ownerEmail ?? null,
        description: 'Primary tenant account for the current AirPulse deployment.',
        subscriptionEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        serviceCode: nextValues.serviceCode ?? null,
        mpesaConsumerKey: nextValues.mpesaConsumerKey ?? null,
        mpesaConsumerSecret: nextValues.mpesaConsumerSecret ?? null,
        mpesaPasskey: nextValues.mpesaPasskey ?? null,
        mpesaShortcode: nextValues.mpesaShortcode ?? null,
        mpesaBusinessShortcode: nextValues.mpesaBusinessShortcode ?? null,
        mpesaPartyB: nextValues.mpesaPartyB ?? null,
        mpesaEnvironment: nextValues.mpesaEnvironment,
        mpesaTransactionType: nextValues.mpesaTransactionType,
        mpesaCallbackUrl: nextValues.mpesaCallbackUrl ?? null,
        tupayUuid: nextValues.tupayUuid ?? null,
        tupayApiKey: nextValues.tupayApiKey ?? null,
        tupaySecret: nextValues.tupaySecret ?? null,
        smsProvider: nextValues.smsProvider ?? null,
        smsPartnerId: nextValues.smsPartnerId ?? null,
        smsApiKey: nextValues.smsApiKey ?? null,
        smsSenderId: nextValues.smsSenderId ?? null,
        smsAccessKey: nextValues.smsAccessKey ?? null,
        smsClientId: nextValues.smsClientId ?? null,
      },
    });
  }

  const updateBusiness = hasBusinessUpdates
    ? prisma.business.update({
        where: { id: business.id },
        data: businessUpdates,
        select: {
          id: true,
          name: true,
          slug: true,
          mpesaConsumerKey: true,
          mpesaConsumerSecret: true,
          mpesaPasskey: true,
          mpesaShortcode: true,
          mpesaBusinessShortcode: true,
          mpesaPartyB: true,
          mpesaEnvironment: true,
          mpesaTransactionType: true,
          mpesaCallbackUrl: true,
          tupayUuid: true,
          tupayApiKey: true,
          tupaySecret: true,
          smsProvider: true,
          smsPartnerId: true,
          smsApiKey: true,
          smsSenderId: true,
          smsAccessKey: true,
          smsClientId: true,
        },
      })
    : prisma.business.findUniqueOrThrow({
        where: { id: business.id },
        select: {
          id: true,
          name: true,
          slug: true,
          mpesaConsumerKey: true,
          mpesaConsumerSecret: true,
          mpesaPasskey: true,
          mpesaShortcode: true,
          mpesaBusinessShortcode: true,
          mpesaPartyB: true,
          mpesaEnvironment: true,
          mpesaTransactionType: true,
          mpesaCallbackUrl: true,
          tupayUuid: true,
          tupayApiKey: true,
          tupaySecret: true,
          smsProvider: true,
          smsPartnerId: true,
          smsApiKey: true,
          smsSenderId: true,
          smsAccessKey: true,
          smsClientId: true,
        },
      });

  const [updatedBusiness, updatedUsers, updatedTransactions, updatedSessions, updatedSavedPhones, updatedAdmins] =
    await prisma.$transaction([
      updateBusiness,
      prisma.user.updateMany({
        where: { businessId: null },
        data: { businessId: business.id },
      }),
      prisma.transaction.updateMany({
        where: { businessId: null },
        data: { businessId: business.id },
      }),
      prisma.ussdSession.updateMany({
        where: { businessId: null },
        data: { businessId: business.id },
      }),
      prisma.savedPhone.updateMany({
        where: { businessId: null },
        data: { businessId: business.id },
      }),
      prisma.admin.updateMany({
        where: {
          businessId: null,
          role: {
            not: 'SUPERADMIN',
          },
        },
        data: { businessId: business.id },
      }),
    ]);

  const remainingOrphans = {
    users: await prisma.user.count({ where: { businessId: null } }),
    transactions: await prisma.transaction.count({ where: { businessId: null } }),
    ussdSessions: await prisma.ussdSession.count({ where: { businessId: null } }),
    savedPhones: await prisma.savedPhone.count({ where: { businessId: null } }),
    admins: await prisma.admin.count({
      where: {
        businessId: null,
        role: {
          not: 'SUPERADMIN',
        },
      },
    }),
  };

  console.log('[NASTEC BACKFILL] Completed');
  console.log(JSON.stringify({
    business: updatedBusiness,
    updatedRows: {
      users: updatedUsers.count,
      transactions: updatedTransactions.count,
      ussdSessions: updatedSessions.count,
      savedPhones: updatedSavedPhones.count,
      admins: updatedAdmins.count,
    },
    remainingOrphans,
  }, null, 2));

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error('[NASTEC BACKFILL] Failed', error);
  await prisma.$disconnect();
  process.exit(1);
});
