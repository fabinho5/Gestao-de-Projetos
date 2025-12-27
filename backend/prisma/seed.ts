import { prisma } from '../src/lib/prisma.js';
import { PartCondition } from '@prisma/client'; // <--- IMPORTA O ENUM
import bcrypt from 'bcryptjs';

async function main() {
  console.log('🌱 A iniciar o seeding...');

  // 1. PASSWORD
  const passwordHash = await bcrypt.hash('123456Tt', 10);

  // 2. ADMIN
  await prisma.user.upsert({
    where: { email: 'admin@fundapecas.pt' },
    update: {},
    create: { username: 'admin', email: 'admin@fundapecas.pt', fullName: 'Sr. Administrador', passwordHash, role: 'ADMIN' },
  });

  // 3. ARMAZÉM (W01) COM CAPACIDADE
  await prisma.warehouse.upsert({
    where: { code: 'W01' },
    update: {},
    create: {
      code: 'W01',
      name: 'Armazém Central',
      locations: {
        create: [
          { fullCode: 'W01-R01-S01', rack: 'R01', shelf: 'S01', capacity: 5 }
        ],
      },
    },
  });

  // 4. ESPECIFICAÇÕES GERAIS
  const specVoltagem = await prisma.specification.create({
    data: { name: 'Voltagem', unit: 'V' }
  });

  const specAmperagem = await prisma.specification.create({
    data: { name: 'Amperagem', unit: 'A' }
  });
  
  console.log('✅ Especificações criadas');

  // 5. CATEGORIA
  const catMotor = await prisma.category.create({
    data: {
      name: 'Motor',
      children: {
        create: [ { name: 'Componentes Elétricos' } ]
      }
    }
  });

  // 6. BUSCAR OS IDs
  const subCat = await prisma.category.findFirst({ 
    where: { name: 'Componentes Elétricos' } 
  });
  const loc = await prisma.location.findFirst({ 
    where: { fullCode: 'W01-R01-S01' } 
  });

  // 7. CRIAR PEÇA COMPLETA
  if (subCat && loc) {
    await prisma.part.create({
      data: {
        name: 'Alternador BMW E46',
        refInternal: 'ALT-BMW-001',
        refOEM: '12317501599',
        price: 85.00,
        condition: PartCondition.USED, // <--- USAR O ENUM
        categoryId: subCat.id,
        locationId: loc.id,
        
        // ESPECIFICAÇÕES
        specifications: {
          create: [
            { specId: specVoltagem.id, value: '12' },
            { specId: specAmperagem.id, value: '150' }
          ]
        }, // <--- FALTAVA ESTA VÍRGULA AQUI!

        // SUB-REFERÊNCIAS
        subReferences: {
          create: [
            { value: '0986041500' }, // Ref Bosch
            { value: 'LRA02854' }    // Ref Lucas
          ]
        }
      }
    });
    console.log('✅ Peça criada com Stock, Specs e Sub-Refs');
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });