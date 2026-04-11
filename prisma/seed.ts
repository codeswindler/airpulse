import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Database...');

  // 1. Reset Tables
  await prisma.transaction.deleteMany();
  await prisma.savedPhone.deleteMany();
  await prisma.ussdSession.deleteMany();
  await prisma.user.deleteMany();
  await prisma.admin.deleteMany();
  await prisma.business.deleteMany();
  await prisma.systemSetting.deleteMany();

  const coreBusiness = await prisma.business.create({
    data: {
      name: 'NASTEC TECHNOLOGIES',
      slug: 'nastec-technologies',
      description: 'Primary tenant account for the current AirPulse deployment.',
      status: 'ACTIVE',
      ownerName: 'NASTEC TECHNOLOGIES',
    },
  });

  // 2. Create Superadmin
  const hashedPassword = await bcrypt.hash('Admin@123!', 10);
  await prisma.admin.create({
    data: {
      email: 'admin@airpulse.svc',
      password: hashedPassword,
      name: 'Super Admin',
      role: 'SUPERADMIN',
    }
  });
  console.log('Created Superadmin: admin@airpulse.svc / Admin@123!');

  // 3. Create Default System Settings
  const settings = [
    { key: 'airpulse_uuid', value: '' },
    { key: 'airpulse_api_key', value: '' },
    { key: 'airpulse_secret', value: '' },
    { key: 'airpulse_business_name', value: 'AirPulse' },
    { key: 'sms_provider', value: 'advanta' },
    { key: 'sms_threshold', value: '500' },
    { key: 'advanta_partner_id', value: '' },
    { key: 'advanta_api_key', value: '' },
    { key: 'advanta_sender_id', value: '' },
    { key: 'onfon_access_key', value: '' },
    { key: 'onfon_api_key', value: '' },
    { key: 'onfon_client_id', value: '' },
    { key: 'onfon_sender_id', value: '' }
  ];

  await Promise.all(settings.map(s => prisma.systemSetting.create({ data: s })));
  console.log('Created Default System Settings.');

  console.log('Seeding Complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
