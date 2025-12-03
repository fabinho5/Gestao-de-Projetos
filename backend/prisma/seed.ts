import { prisma } from '../src/lib/prisma.js';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('🌱 A iniciar o seeding...');

  // 1. PASSWORD
  const passwordHash = await bcrypt.hash('123456', 10);

  // 2. ADMIN
  await prisma.user.upsert({
    where: { email: 'admin@fundapecas.pt' },
    update: {},
    create: { email: 'admin@fundapecas.pt', fullName: 'Sr. Administrador', passwordHash, role: 'ADMIN' },
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

  // 4. ESPECIFICAÇÕES GERAIS (O Template)
  // Vamos criar "Voltagem" e "Amperagem"
  const specVoltagem = await prisma.specification.create({
    data: { name: 'Voltagem', unit: 'V' }
  });

  const specAmperagem = await prisma.specification.create({
    data: { name: 'Amperagem', unit: 'A' }
  });
  
  console.log('✅ Especificações criadas');

  // 5. CATEGORIA + LIGAÇÃO ÀS SPECS
  // Criamos "Componentes Elétricos" e dizemos que aceita Voltagem e Amperagem
  const catMotor = await prisma.category.create({
    data: {
      name: 'Motor',
      children: {
        create: [
          { 
            name: 'Componentes Elétricos',
            // AQUI ESTÁ A MÁGICA: Ligamos as specs à categoria
            allowedSpecs: {
              create: [
                { specId: specVoltagem.id },
                { specId: specAmperagem.id }
              ]
            }
          }
        ]
      }
    }
  });

  console.log('✅ Categorias criadas com regras de especificação');

  // 6. BUSCAR OS IDs PARA CRIAR A PEÇA
  const subCat = await prisma.category.findFirst({ 
    where: { name: 'Componentes Elétricos' } 
  });
  const loc = await prisma.location.findFirst({ 
    where: { fullCode: 'W01-R01-S01' } 
  });

  // 7. CRIAR PEÇA COM VALORES REAIS
  if (subCat && loc) {
    await prisma.part.create({
      data: {
        name: 'Alternador BMW E46',
        refInternal: 'ALT-BMW-001',
        price: 85.00,
        categoryId: subCat.id,
        locationId: loc.id,
        
        // PREENCHER OS VALORES DAS ESPECIFICAÇÕES
        specifications: {
          create: [
            { specId: specVoltagem.id, value: '12' },   // 12 V
            { specId: specAmperagem.id, value: '150' }  // 150 A
          ]
        }
      }
    });
    console.log('✅ Peça criada com Stock e Especificações');
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });