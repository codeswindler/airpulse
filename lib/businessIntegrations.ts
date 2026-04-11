import { prisma } from './prisma';

export type BusinessIntegrationSnapshot = {
  id: string;
  name: string;
  mpesaConsumerKey: string | null;
  mpesaConsumerSecret: string | null;
  mpesaPasskey: string | null;
  mpesaShortcode: string | null;
  mpesaBusinessShortcode: string | null;
  mpesaPartyB: string | null;
  mpesaEnvironment: string | null;
  mpesaTransactionType: string | null;
  mpesaCallbackUrl: string | null;
  tupayUuid: string | null;
  tupayApiKey: string | null;
  tupaySecret: string | null;
  smsProvider: string | null;
  smsPartnerId: string | null;
  smsApiKey: string | null;
  smsSenderId: string | null;
  smsAccessKey: string | null;
  smsClientId: string | null;
};

export async function getBusinessIntegrationSnapshot(businessId?: string | null): Promise<BusinessIntegrationSnapshot | null> {
  if (!businessId) {
    return null;
  }

  return prisma.business.findUnique({
    where: { id: businessId },
    select: {
      id: true,
      name: true,
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
}
