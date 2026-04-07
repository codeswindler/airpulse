const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Available properties on prisma client:');
  const props = Object.keys(prisma).filter(k => !k.startsWith('_') && typeof prisma[k] === 'object');
  console.log(JSON.stringify(props, null, 2));
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
