import { prisma } from '../src/lib/prisma.js';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('inicialization of seed data');

  // ecrypt password
  const passwordHash = await bcrypt.hash('123456', 10);

  // create a random admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@fundapecas.pt' },
    update: {},
    create: {
      email: 'admin@fundapecas.pt',
      fullName: 'Sr. Administrador',
      passwordHash,
      role: 'ADMIN',
    },
  });

  // create a warehouse user
  const warehouseUser = await prisma.user.upsert({
    where: { email: 'armazem@fundapecas.pt' },
    update: {},
    create: {
      email: 'armazem@fundapecas.pt',
      fullName: 'José do Armazém',
      passwordHash,
      role: 'WAREHOUSE',
    },
  });

  console.log('all users were created successfully');

  // create a warehouse with locations
  const warehouse = await prisma.warehouse.upsert({
    where: { code: 'W01' },
    update: {},
    create: {
      code: 'W01',
      name: 'Armazém Central - Lisboa',
      locations: {
        create: [
          { fullCode: 'W01-R01-S01', rack: 'R01', shelf: 'S01' }
        ],
      },
    },
  });

  console.log('warehouse created');

  // create categories and subcategories
  await prisma.category.create({
    data: {
      name: 'Motor',
      children: { create: [{ name: 'Componentes Elétricos' }] }
    }
  });
  console.log('categories created');
  const subCat = await prisma.category.findFirst({ where: { name: 'Componentes Elétricos' } });
  const loc = await prisma.location.findFirst({ where: { fullCode: 'W01-R01-S01' } });

  // create a part with stock
  if (subCat && loc) {
    await prisma.part.create({
      data: {
        name: 'Alternador BMW E46',
        refInternal: 'ALT-BMW-001',
        description: 'Original e funcional.',
        price: 85.00,
        categoryId: subCat.id,
        locations: {
            create: { quantity: 5, locationId: loc.id }
        }
      }
    });
    console.log('Part created with initial stock');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    // We don't need to manually disconnect with our Singleton, 
    // but the script needs to end.
    await prisma.$disconnect();
  });