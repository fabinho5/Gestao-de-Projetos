import { MovementType, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

// Tipo para transações Prisma
type TransactionClient = Prisma.TransactionClient;

// ============================================
// TIPOS
// ============================================

interface CreateMovementParams {
  partId: number;
  userId: number;
  type: MovementType;
  sourceLocId?: number | null;
  destLocId?: number | null;
}

interface TransferParams {
  partId: number;
  userId: number;
  fromLocationId: number;
  toLocationId: number;
}

interface ReturnParams {
  partId: number;
  userId: number;
  toLocationId?: number;  // Obrigatório apenas se isDamaged=false
  isDamaged?: boolean;
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

/**
 * Valida se uma localização existe e está ativa
 */
async function validateLocation(locationId: number): Promise<boolean> {
  const location = await prisma.location.findUnique({
    where: { id: locationId },
    include: { warehouse: true }
  });
  
  return location !== null && location.warehouse.deletedAt === null;
}

/**
 * Verifica se uma localização tem capacidade disponível
 */
async function checkLocationCapacity(locationId: number): Promise<boolean> {
  const location = await prisma.location.findUnique({
    where: { id: locationId },
    include: {
      _count: {
        select: { parts: true }
      }
    }
  });
  
  if (!location) return false;
  
  return location._count.parts < location.capacity;
}

// ============================================
// MOVIMENTOS DE STOCK
// ============================================

/**
 * Cria um movimento de stock genérico
 */
async function createMovement(params: CreateMovementParams) {
  const { partId, userId, type, sourceLocId, destLocId } = params;
  
  return prisma.stockMovement.create({
    data: {
      partId,
      userId,
      type,
      sourceLocId,
      destLocId
    },
    include: {
      part: true,
      user: {
        select: { id: true, username: true, fullName: true }
      },
      sourceLoc: {
        include: { warehouse: true }
      },
      destLoc: {
        include: { warehouse: true }
      }
    }
  });
}

/**
 * ENTRY - Entrada de peça no sistema (criação ou reposição)
 * - Part.locationId é atualizado para destLocId
 */
async function recordEntry(partId: number, userId: number, locationId: number) {
  // Validar localização
  const isValid = await validateLocation(locationId);
  if (!isValid) {
    throw new Error('Localização inválida ou armazém desativado');
  }
  
  // Verificar capacidade
  const hasCapacity = await checkLocationCapacity(locationId);
  if (!hasCapacity) {
    throw new Error('Localização sem capacidade disponível');
  }
  
  // Transação: criar movimento + atualizar Part.locationId
  return prisma.$transaction(async (tx: TransactionClient) => {
    // Criar movimento
    const movement = await tx.stockMovement.create({
      data: {
        partId,
        userId,
        type: 'ENTRY',
        destLocId: locationId
      }
    });
    
    // Atualizar localização da peça
    await tx.part.update({
      where: { id: partId },
      data: { locationId }
    });
    
    return movement;
  });
}

/**
 * EXIT - Saída de peça do sistema (reserva completada)
 * - Part.locationId passa a null
 */
async function recordExit(partId: number, userId: number) {
  // Buscar peça com localização atual
  const part = await prisma.part.findUnique({
    where: { id: partId },
    select: { locationId: true }
  });
  
  if (!part) {
    throw new Error('Peça não encontrada');
  }
  
  // Transação: criar movimento + remover locationId da Part
  return prisma.$transaction(async (tx: TransactionClient) => {
    // Criar movimento
    const movement = await tx.stockMovement.create({
      data: {
        partId,
        userId,
        type: 'EXIT',
        sourceLocId: part.locationId
      }
    });
    
    // Remover localização da peça
    await tx.part.update({
      where: { id: partId },
      data: { locationId: null }
    });
    
    return movement;
  });
}

/**
 * TRANSFER - Transferência de peça entre localizações
 */
async function recordTransfer(params: TransferParams) {
  const { partId, userId, fromLocationId, toLocationId } = params;
  
  // Validar localização de destino
  const isValid = await validateLocation(toLocationId);
  if (!isValid) {
    throw new Error('Localização de destino inválida');
  }
  
  // Verificar capacidade no destino
  const hasCapacity = await checkLocationCapacity(toLocationId);
  if (!hasCapacity) {
    throw new Error('Localização de destino sem capacidade');
  }
  
  // Verificar se peça está na localização de origem
  const part = await prisma.part.findUnique({
    where: { id: partId },
    select: { locationId: true }
  });
  
  if (!part || part.locationId !== fromLocationId) {
    throw new Error('Peça não está na localização de origem especificada');
  }
  
  // Transação: criar movimento + atualizar localização
  return prisma.$transaction(async (tx: TransactionClient) => {
    const movement = await tx.stockMovement.create({
      data: {
        partId,
        userId,
        type: 'TRANSFER',
        sourceLocId: fromLocationId,
        destLocId: toLocationId
      }
    });
    
    await tx.part.update({
      where: { id: partId },
      data: { locationId: toLocationId }
    });
    
    return movement;
  });
}

/**
 * RETURN - Devolução de peça ao stock
 * - isDamaged: true → condition=DAMAGED, isVisible=false, locationId=null
 * - isDamaged: false → peça volta para toLocationId (obrigatório)
 */
async function recordReturn(params: ReturnParams) {
  const { partId, userId, toLocationId, isDamaged = false } = params;
  
  if (isDamaged) {
    // Peça danificada: não vai para localização
    return prisma.$transaction(async (tx: TransactionClient) => {
      const movement = await tx.stockMovement.create({
        data: {
          partId,
          userId,
          type: 'RETURN',
          destLocId: null
        }
      });
      
      // Marcar como danificada e invisível
      await tx.part.update({
        where: { id: partId },
        data: {
          condition: 'DAMAGED',
          isVisible: false,
          locationId: null
        }
      });
      
      return movement;
    });
  }
  
  // Devolução normal: peça volta ao stock
  if (!toLocationId) {
    throw new Error('Localização de retorno é obrigatória para devoluções não danificadas');
  }
  
  const isValid = await validateLocation(toLocationId);
  if (!isValid) {
    throw new Error('Localização de retorno inválida');
  }
  
  const hasCapacity = await checkLocationCapacity(toLocationId);
  if (!hasCapacity) {
    throw new Error('Localização de retorno sem capacidade');
  }
  
  return prisma.$transaction(async (tx: TransactionClient) => {
    const movement = await tx.stockMovement.create({
      data: {
        partId,
        userId,
        type: 'RETURN',
        destLocId: toLocationId
      }
    });
    
    await tx.part.update({
      where: { id: partId },
      data: { locationId: toLocationId }
    });
    
    return movement;
  });
}

/**
 * ADJUSTMENT - Ajuste manual de stock (correções)
 */
async function recordAdjustment(
  partId: number,
  userId: number,
  newLocationId: number | null
) {
  const part = await prisma.part.findUnique({
    where: { id: partId },
    select: { locationId: true }
  });
  
  if (!part) {
    throw new Error('Peça não encontrada');
  }
  
  if (newLocationId !== null) {
    const isValid = await validateLocation(newLocationId);
    if (!isValid) {
      throw new Error('Localização inválida');
    }
    
    const hasCapacity = await checkLocationCapacity(newLocationId);
    if (!hasCapacity) {
      throw new Error('Localização sem capacidade');
    }
  }
  
  return prisma.$transaction(async (tx: TransactionClient) => {
    const movement = await tx.stockMovement.create({
      data: {
        partId,
        userId,
        type: 'ADJUSTMENT',
        sourceLocId: part.locationId,
        destLocId: newLocationId
      }
    });
    
    await tx.part.update({
      where: { id: partId },
      data: { locationId: newLocationId }
    });
    
    return movement;
  });
}

// ============================================
// CONSULTAS
// ============================================

/**
 * Obtém histórico de movimentos de uma peça
 */
async function getPartMovements(partId: number) {
  return prisma.stockMovement.findMany({
    where: { partId },
    include: {
      user: {
        select: { id: true, username: true, fullName: true }
      },
      sourceLoc: {
        include: { warehouse: true }
      },
      destLoc: {
        include: { warehouse: true }
      }
    },
    orderBy: { timestamp: 'desc' }
  });
}

/**
 * Obtém movimentos recentes (para dashboard)
 */
async function getRecentMovements(limit: number = 50) {
  return prisma.stockMovement.findMany({
    include: {
      part: {
        select: { id: true, name: true, refInternal: true }
      },
      user: {
        select: { id: true, username: true, fullName: true }
      },
      sourceLoc: {
        include: { warehouse: true }
      },
      destLoc: {
        include: { warehouse: true }
      }
    },
    orderBy: { timestamp: 'desc' },
    take: limit
  });
}

/**
 * Lista localizações disponíveis para retorno
 * (com capacidade e dados do warehouse para UI amigável)
 */
async function getAvailableLocations(warehouseId?: number) {
  const where: any = {
    warehouse: {
      deletedAt: null
    }
  };
  
  if (warehouseId) {
    where.warehouseId = warehouseId;
  }
  
  const locations = await prisma.location.findMany({
    where,
    include: {
      warehouse: {
        select: { id: true, code: true, name: true }
      },
      _count: {
        select: { parts: true }
      }
    },
    orderBy: [
      { warehouseId: 'asc' },
      { rack: 'asc' },
      { shelf: 'asc' },
      { pallet: 'asc' }
    ]
  });
  
  // Adicionar info de capacidade disponível
  return locations.map((loc) => ({
    id: loc.id,
    fullCode: loc.fullCode,
    rack: loc.rack,
    shelf: loc.shelf,
    pallet: loc.pallet,
    warehouse: loc.warehouse,
    capacity: loc.capacity,
    currentParts: loc._count.parts,
    availableSpace: loc.capacity - loc._count.parts,
    hasSpace: loc._count.parts < loc.capacity
  }));
}

export const stockMovementService = {
  // Movimentos
  createMovement,
  recordEntry,
  recordExit,
  recordTransfer,
  recordReturn,
  recordAdjustment,
  
  // Consultas
  getPartMovements,
  getRecentMovements,
  getAvailableLocations,
  
  // Auxiliares
  validateLocation,
  checkLocationCapacity
};
