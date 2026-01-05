import { prisma } from '../src/lib/prisma.js';
import { PartCondition } from '@prisma/client';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('🌱 A iniciar o seeding...');

  const passwordHash = await bcrypt.hash('123456Tt', 10);

  // Utilizadores base
  await prisma.user.upsert({
    where: { email: 'admin@fundapecas.pt' },
    update: {},
    create: { username: 'admin', email: 'admin@fundapecas.pt', fullName: 'Sr. Administrador', passwordHash, role: 'ADMIN' },
  });
  await prisma.user.upsert({
    where: { email: 'warehouse@fundapecas.pt' },
    update: {},
    create: { username: 'warehouse', email: 'warehouse@fundapecas.pt', fullName: 'Gestor Armazém', passwordHash, role: 'WAREHOUSE' },
  });
  await prisma.user.upsert({
    where: { email: 'sales@fundapecas.pt' },
    update: {},
    create: { username: 'sales', email: 'sales@fundapecas.pt', fullName: 'Comercial', passwordHash, role: 'SALES' },
  });
  await prisma.user.upsert({
    where: { email: 'cliente@fundapecas.pt' },
    update: {},
    create: { username: 'cliente', email: 'cliente@fundapecas.pt', fullName: 'Cliente Demo', passwordHash, role: 'CLIENT' },
  });

  // Armazéns e localizações
  const warehouse = await prisma.warehouse.upsert({
    where: { code: 'W01' },
    update: {},
    create: {
      code: 'W01',
      name: 'Armazém Central',
      locations: {
        create: [
          { fullCode: 'W01-R01-S01', rack: 'R01', shelf: 'S01', capacity: 5 },
          { fullCode: 'W01-R01-S02', rack: 'R01', shelf: 'S02', capacity: 2 },
          { fullCode: 'W01-R02-S01', rack: 'R02', shelf: 'S01', capacity: 1 },
          { fullCode: 'W01-R02-S02-P01', rack: 'R02', shelf: 'S02', pallet: 'P01', capacity: 3 },
        ],
      },
    },
    include: { locations: true },
  });

  const warehouse2 = await prisma.warehouse.upsert({
    where: { code: 'W02' },
    update: {},
    create: {
      code: 'W02',
      name: 'Armazém Norte',
      locations: {
        create: [
          { fullCode: 'W02-R01-S01', rack: 'R01', shelf: 'S01', capacity: 4 },
          { fullCode: 'W02-R01-S02', rack: 'R01', shelf: 'S02', capacity: 2 },
        ],
      },
    },
    include: { locations: true },
  });

  // Especificações
  const specVoltagem = await prisma.specification.upsert({ where: { name: 'Voltagem' }, update: {}, create: { name: 'Voltagem', unit: 'V' } });
  const specAmperagem = await prisma.specification.upsert({ where: { name: 'Amperagem' }, update: {}, create: { name: 'Amperagem', unit: 'A' } });
  const specPeso = await prisma.specification.upsert({ where: { name: 'Peso' }, update: {}, create: { name: 'Peso', unit: 'kg' } });
  const specLado = await prisma.specification.upsert({ where: { name: 'Lado' }, update: {}, create: { name: 'Lado', unit: undefined } });

  // Categorias
  const catMotor = await prisma.category.upsert({ where: { name: 'Motor' }, update: {}, create: { name: 'Motor' } });
  const catTravagem = await prisma.category.upsert({ where: { name: 'Travagem' }, update: {}, create: { name: 'Travagem' } });
  const catEletrico = await prisma.category.upsert({ where: { name: 'Componentes Elétricos' }, update: {}, create: { name: 'Componentes Elétricos', parentId: catMotor.id } });
  const catFiltros = await prisma.category.upsert({ where: { name: 'Filtros' }, update: {}, create: { name: 'Filtros' } });

  // Suppliers
  const supplierBosch = await prisma.supplier.upsert({ where: { name: 'Bosch' }, update: {}, create: { name: 'Bosch', contact: 'bosch@example.com' } });
  const supplierValeo = await prisma.supplier.upsert({ where: { name: 'Valeo' }, update: {}, create: { name: 'Valeo', contact: 'valeo@example.com' } });

  // Helper to find location IDs
  const locW01S01 = warehouse.locations.find((l) => l.fullCode === 'W01-R01-S01');
  const locW01S02 = warehouse.locations.find((l) => l.fullCode === 'W01-R01-S02');
  const locW01Pallet = warehouse.locations.find((l) => l.fullCode === 'W01-R02-S02-P01');
  const locW02S01 = warehouse2.locations.find((l) => l.fullCode === 'W02-R01-S01');

  // Parts (mix of conditions, locations, specs)
  if (locW01S01 && locW01S02 && locW01Pallet && locW02S01) {
    await prisma.part.create({
      data: {
        name: 'Alternador BMW E46',
        refInternal: 'ALT-BMW-001',
        refOEM: '12317501599',
        price: 85.0,
        condition: PartCondition.USED,
        categoryId: catEletrico.id,
        supplierId: supplierBosch.id,
        locationId: locW01S01.id,
        specifications: { create: [ { specId: specVoltagem.id, value: '12' }, { specId: specAmperagem.id, value: '150' } ] },
        subReferences: { create: [ { value: '0986041500' }, { value: 'LRA02854' } ] },
      },
    });

    await prisma.part.create({
      data: {
        name: 'Disco de Travão VW Golf',
        refInternal: 'BRK-VW-010',
        refOEM: '1K0615301AA',
        price: 45.5,
        condition: PartCondition.NEW,
        categoryId: catTravagem.id,
        supplierId: supplierValeo.id,
        locationId: locW01S02.id,
        specifications: { create: [ { specId: specPeso.id, value: '6.2' } ] },
        subReferences: { create: [ { value: 'DF1234' } ] },
      },
    });

    await prisma.part.create({
      data: {
        name: 'Filtro de Óleo Renault',
        refInternal: 'OIL-REN-007',
        refOEM: '7700274177',
        price: 12.3,
        condition: PartCondition.NEW,
        categoryId: catFiltros.id,
        supplierId: supplierBosch.id,
        locationId: locW02S01.id,
        specifications: { create: [ { specId: specPeso.id, value: '0.4' } ] },
        subReferences: { create: [ { value: 'OX123' } ] },
      },
    });

    await prisma.part.create({
      data: {
        name: 'Sensor ABS BMW',
        refInternal: 'ABS-BMW-003',
        refOEM: '34526756381',
        price: 28.9,
        condition: PartCondition.USED,
        categoryId: catEletrico.id,
        supplierId: supplierValeo.id,
        locationId: locW01Pallet.id,
        specifications: { create: [ { specId: specLado.id, value: 'Esquerdo' } ] },
        subReferences: { create: [ { value: 'GIC198' } ] },
      },
    });
  }

  console.log('✅ Seeding concluído');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });