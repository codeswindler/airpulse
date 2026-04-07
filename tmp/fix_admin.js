const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  try {
    const hashedPassword = await bcrypt.hash('Admin@123!', 10);
    
    // Find any admin and update it to the new branding
    // We target admin@tupay.svc specifically if it exists, otherwise we create a new one
    const tupayAdmin = await prisma.admin.findUnique({
      where: { email: 'admin@tupay.svc' }
    });

    if (tupayAdmin) {
      await prisma.admin.update({
        where: { email: 'admin@tupay.svc' },
        data: { 
          email: 'admin@airpulse.svc',
          password: hashedPassword,
          name: 'Super Admin',
          role: 'SUPERADMIN'
        }
      });
      console.log('✅ Updated existing admin@tupay.svc to admin@airpulse.svc');
    } else {
      // Check if admin@airpulse.svc already exists
      const airpulseAdmin = await prisma.admin.findUnique({
        where: { email: 'admin@airpulse.svc' }
      });

      if (!airpulseAdmin) {
        await prisma.admin.create({
          data: {
            email: 'admin@airpulse.svc',
            password: hashedPassword,
            name: 'Super Admin',
            role: 'SUPERADMIN'
          }
        });
        console.log('✅ Created new admin@airpulse.svc');
      } else {
        // Just reset the password
        await prisma.admin.update({
          where: { email: 'admin@airpulse.svc' },
          data: { password: hashedPassword }
        });
        console.log('✅ Reset password for existing admin@airpulse.svc');
      }
    }
  } catch (error) {
    console.error('❌ Error updating database:', error);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

main();
