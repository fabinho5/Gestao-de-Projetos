import { prisma } from '../lib/prisma.js';
import { Prisma } from '@prisma/client';

export class WarehouseService {
  static async listWarehouses() {
    const warehouses = await prisma.warehouse.findMany({
      where: { deletedAt: null },
      include: {
        _count: { select: { locations: true } },
      },
    });

    return warehouses.map(({ _count, ...rest }) => ({
      ...rest,
      locationCount: _count.locations,
    }));
  }

  static async getWarehouseById(id: number) {
    return prisma.warehouse.findFirst({
      where: { id, deletedAt: null },
      include: {
        locations: true,
        _count: { select: { locations: true } },
      },
    });
  }

  static async createWarehouse(data: { code: string; name: string }) {
    try {
      return await prisma.warehouse.create({ data });
    } catch (error: any) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new Error('Warehouse code already exists');
      }
      throw error;
    }
  }

  static buildFullCode(warehouseCode: string, rack: string, shelf: string, pallet?: string | null) {
    return pallet
      ? `${warehouseCode}-${rack}-${shelf}-${pallet}`
      : `${warehouseCode}-${rack}-${shelf}`;
  }

  static async createLocation(params: { warehouseId: number; rack: string; shelf: string; pallet?: string | null; capacity: number }) {
    const { warehouseId, rack, shelf, pallet, capacity } = params;

    const warehouse = await prisma.warehouse.findFirst({ where: { id: warehouseId, deletedAt: null } });
    if (!warehouse) {
      throw new Error('Warehouse not found');
    }

    const fullCode = WarehouseService.buildFullCode(warehouse.code, rack, shelf, pallet ?? undefined);

    try {
      return await prisma.location.create({
        data: {
          warehouseId,
          rack,
          shelf,
          pallet: pallet ?? null,
          capacity,
          fullCode,
        },
      });
    } catch (error: any) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new Error('Location fullCode already exists');
      }
      throw error;
    }
  }

  static async listLocations(warehouseId: number) {
    const warehouse = await prisma.warehouse.findFirst({ where: { id: warehouseId, deletedAt: null } });
    if (!warehouse) {
      throw new Error('Warehouse not found');
    }

    return prisma.location.findMany({
      where: { warehouseId },
      orderBy: [
        { rack: 'asc' },
        { shelf: 'asc' },
        { pallet: 'asc' },
      ],
    });
  }

  static async updateLocation(id: number, data: { rack?: string; shelf?: string; pallet?: string | null; capacity?: number }) {
    const existing = await prisma.location.findUnique({ where: { id }, include: { warehouse: true, _count: { select: { parts: true } } } });
    if (!existing || existing.warehouse.deletedAt !== null) {
      throw new Error('Location not found');
    }

    const rack = data.rack ?? existing.rack;
    const shelf = data.shelf ?? existing.shelf;
    const pallet = data.pallet === undefined ? existing.pallet : data.pallet;
    const capacity = data.capacity ?? existing.capacity;
    const used = existing._count.parts;

    if (data.capacity !== undefined && capacity < used) {
      throw new Error(`Capacity cannot be less than current occupancy (${used})`);
    }

    const fullCode = WarehouseService.buildFullCode(existing.warehouse.code, rack, shelf, pallet ?? undefined);

    try {
      return await prisma.location.update({
        where: { id },
        data: { rack, shelf, pallet: pallet ?? null, capacity, fullCode },
      });
    } catch (error: any) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new Error('Location fullCode already exists');
      }
      throw error;
    }
  }

  static async capacityCheck(id: number) {
    const loc = await prisma.location.findUnique({
      where: { id },
      include: { _count: { select: { parts: true } } },
    });

    if (!loc) {
      throw new Error('Location not found');
    }

    const used = loc._count.parts;
    const availableSlots = loc.capacity - used;
    return {
      id: loc.id,
      warehouseId: loc.warehouseId,
      rack: loc.rack,
      shelf: loc.shelf,
      pallet: loc.pallet,
      fullCode: loc.fullCode,
      capacity: loc.capacity,
      used,
      availableSlots,
      isAvailable: availableSlots > 0,
    };
  }

  static async searchLocations(params: { warehouseId?: number; rack?: string; shelf?: string; available?: boolean }) {
    const { warehouseId, rack, shelf, available } = params;

    const where: Prisma.LocationWhereInput = {};
    if (warehouseId !== undefined) where.warehouseId = warehouseId;
    if (rack) where.rack = rack;
    if (shelf) where.shelf = shelf;

    const locations = await prisma.location.findMany({
      where,
      include: {
        _count: { select: { parts: true } },
      },
      orderBy: [
        { warehouseId: 'asc' },
        { rack: 'asc' },
        { shelf: 'asc' },
        { pallet: 'asc' },
      ],
    });

    const mapped = locations.map((loc) => {
      const used = loc._count.parts;
      const availableSlots = loc.capacity - used;
      return {
        ...loc,
        used,
        availableSlots,
        isAvailable: availableSlots > 0,
      };
    });

    if (available === undefined) return mapped;
    return mapped.filter((loc) => loc.isAvailable === available);
  }
}
