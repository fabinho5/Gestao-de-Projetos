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

  // 4. ESPECIFICAÇÕES GERAIS (Globais)
  // Criamos as especificações que podem ser usadas em qualquer peça
  const specVoltagem = await prisma.specification.create({
    data: { name: 'Voltagem', unit: 'V' }
  });

  const specAmperagem = await prisma.specification.create({
    data: { name: 'Amperagem', unit: 'A' }
  });
  
  console.log('✅ Especificações criadas');

  // 5. CATEGORIA (CORREÇÃO AQUI)
  // Criamos apenas a categoria. Já NÃO ligamos specs aqui (tabela CategorySpecification foi removida).
  const catMotor = await prisma.category.create({
    data: {
      name: 'Motor',
      children: {
        create: [
          { name: 'Componentes Elétricos' } // <--- Simples, sem allowedSpecs
        ]
      }
    }
  });

  console.log('✅ Categorias criadas');

  // 6. BUSCAR OS IDs PARA CRIAR A PEÇA
  const subCat = await prisma.category.findFirst({ 
    where: { name: 'Componentes Elétricos' } 
  });
  const loc = await prisma.location.findFirst({ 
    where: { fullCode: 'W01-R01-S01' } 
  });

  // 7. CRIAR PEÇA COM VALORES REAIS
  // Aqui dizemos: "ESTA peça específica tem 12V e 150A"
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
            { specId: specVoltagem.id, value: '12' },   // Valor: 12
            { specId: specAmperagem.id, value: '150' }  // Valor: 150
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