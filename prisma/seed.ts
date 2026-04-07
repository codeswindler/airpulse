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
  await prisma.systemSetting.deleteMany();

  // 2. Create Superadmin
  const hashedPassword = await bcrypt.hash('Admin@123!', 10);
  await prisma.admin.create({
    data: {
      email: 'admin@airpulse.svc',
      password: hashedPassword,
      name: 'Super Admin',
      role: 'SUPERADMIN'
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

  // 4. Create Users with random Wallets
  const users = await Promise.all(
    Array.from({ length: 15 }).map(async () => {
      return prisma.user.create({
        data: {
          phoneNumber: `2547${Math.floor(10000000 + Math.random() * 90000000)}`,
          walletBalance: Math.random() > 0.5 ? Math.floor(Math.random() * 500) : 0,
        },
      });
    })
  );
  console.log(`Created ${users.length} Users.`);

  // 5. Create Transactions
  const statuses = ['AIRTIME_DELIVERED', 'AIRTIME_DELIVERED', 'AIRTIME_DELIVERED', 'FAILED', 'PENDING_STK'];
  
  const txPromise = Array.from({ length: 45 }).map(async () => {
    const randomUser = users[Math.floor(Math.random() * users.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    
    // Simulate transactions spread over the last 30 days
    const daysAgo = Math.floor(Math.random() * 30);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);

    return prisma.transaction.create({
      data: {
        transactionId: uuidv4(),
        phoneNumber: randomUser.phoneNumber,
        targetPhone: Math.random() > 0.7 ? randomUser.phoneNumber : `2547${Math.floor(10000000 + Math.random() * 90000000)}`,
        amount: [10, 20, 50, 100, 500][Math.floor(Math.random() * 5)],
        status,
        createdAt: date,
        updatedAt: date
      }
    });
  });

  await Promise.all(txPromise);
  console.log(`Created 45 Transactions.`);

  // 6. Create active USSD sessions
  await Promise.all(
    Array.from({ length: 4 }).map(async (_, idx) => {
      const u = users[idx];
      return prisma.ussdSession.create({
         data: {
           sessionId: uuidv4(),
           phoneNumber: u.phoneNumber,
           state: 'ENTER_AMOUNT_MY_NUMBER'
         }
      });
    })
  );

  console.log(`Created 4 Active USSD Sessions.`);
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
