import { prisma } from '../src/lib/prisma.js';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('🌱 A iniciar o seeding...');

  // 1. Criar hash da password
  const passwordHash = await bcrypt.hash('123456', 10);

  // 2. Criar Admin
  await prisma.user.upsert({
    where: { email: 'admin@fundapecas.pt' },
    update: {},
    create: { email: 'admin@fundapecas.pt', fullName: 'Sr. Administrador', passwordHash, role: 'ADMIN' },
  });

  // 3. Criar Armazém e Localização (COM CAPACIDADE)
  await prisma.warehouse.upsert({
    where: { code: 'W01' },
    update: {},
    create: {
      code: 'W01',
      name: 'Armazém Central',
      locations: {
        create: [
          // Repara no capacity: 5
          { fullCode: 'W01-R01-S01', rack: 'R01', shelf: 'S01', capacity: 5 } 
        ],
      },
    },
  });

  // 4. Criar Categoria
  const catMotor = await prisma.category.create({
    data: { name: 'Motor', children: { create: [{ name: 'Componentes Elétricos' }] } }
  });

  // Buscar IDs necessários
  const subCat = await prisma.category.findFirst({ where: { name: 'Componentes Elétricos' } });
  const loc = await prisma.location.findFirst({ where: { fullCode: 'W01-R01-S01' } });

  // 5. Criar Peça (A GRANDE MUDANÇA ESTÁ AQUI)
  if (subCat && loc) {
    await prisma.part.create({
      data: {
        name: 'Alternador BMW E46',
        refInternal: 'ALT-BMW-001',
        price: 85.00,
        categoryId: subCat.id,
        // AGORA LIGAMOS DIRETAMENTE À LOCALIZAÇÃO
        locationId: loc.id 
      }
    });
    console.log('✅ Peça criada no slot W01-R01-S01');
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });