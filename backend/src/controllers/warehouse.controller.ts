import { Request, Response } from 'express';
import { WarehouseService } from '../services/warehouse.service.js';
import { Logger } from '../utils/logger.js';
import { z } from 'zod';

const createWarehouseSchema = z.object({
  code: z.string().trim().min(1),
  name: z.string().trim().min(1),
});

const createLocationSchema = z.object({
  rack: z.string().trim().min(1),
  shelf: z.string().trim().min(1),
  pallet: z.string().trim().min(1).optional(),
  capacity: z.coerce.number().int().positive().default(1),
});

const updateLocationSchema = z.object({
  rack: z.string().trim().min(1).optional(),
  shelf: z.string().trim().min(1).optional(),
  pallet: z.string().trim().min(1).optional().nullable(),
  capacity: z.coerce.number().int().positive().optional(),
}).refine((val) => Object.keys(val).length > 0, { message: 'At least one field must be provided' });


export class WarehouseController {
  static async list(req: Request, res: Response) {
    try {
      const warehouses = await WarehouseService.listWarehouses();
      res.status(200).json(warehouses);
    } catch (error) {
      Logger.error('Error listing warehouses', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async show(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ message: 'Invalid warehouse id' });
      }

      const warehouse = await WarehouseService.getWarehouseById(id);
      if (!warehouse) {
        return res.status(404).json({ message: 'Warehouse not found' });
      }

      const { _count, ...rest } = warehouse as any;
      return res.status(200).json({ ...rest, locationCount: _count?.locations ?? 0 });
    } catch (error) {
      Logger.error('Error fetching warehouse', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async create(req: Request, res: Response) {
    try {
      const payload = createWarehouseSchema.parse(req.body);
      const warehouse = await WarehouseService.createWarehouse(payload);
      res.status(201).json(warehouse);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation failed', errors: error.errors });
      }

      if (error instanceof Error && error.message.includes('code already exists')) {
        return res.status(409).json({ message: error.message });
      }

      Logger.error('Error creating warehouse', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async createLocation(req: Request, res: Response) {
    try {
      const warehouseId = Number(req.params.id);
      if (!Number.isInteger(warehouseId) || warehouseId <= 0) {
        return res.status(400).json({ message: 'Invalid warehouse id' });
      }

      const payload = createLocationSchema.parse(req.body);
      const location = await WarehouseService.createLocation({ warehouseId, ...payload });
      res.status(201).json(location);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation failed', errors: error.errors });
      }

      if (error instanceof Error && error.message.includes('Warehouse not found')) {
        return res.status(404).json({ message: error.message });
      }

      if (error instanceof Error && error.message.includes('fullCode already exists')) {
        return res.status(409).json({ message: error.message });
      }

      Logger.error('Error creating location', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async listLocations(req: Request, res: Response) {
    try {
      const warehouseId = Number(req.params.id);
      if (!Number.isInteger(warehouseId) || warehouseId <= 0) {
        return res.status(400).json({ message: 'Invalid warehouse id' });
      }

      const locations = await WarehouseService.listLocations(warehouseId);
      res.status(200).json(locations);
    } catch (error: any) {
      if (error instanceof Error && error.message.includes('Warehouse not found')) {
        return res.status(404).json({ message: error.message });
      }

      Logger.error('Error listing locations', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async updateLocation(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ message: 'Invalid location id' });
      }

      const payload = updateLocationSchema.parse(req.body);
      const location = await WarehouseService.updateLocation(id, payload);
      return res.status(200).json(location);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation failed', errors: error.errors });
      }

      if (error instanceof Error && error.message.includes('Location not found')) {
        return res.status(404).json({ message: error.message });
      }

      if (error instanceof Error && error.message.includes('fullCode already exists')) {
        return res.status(409).json({ message: error.message });
      }

      if (error instanceof Error && error.message.includes('Capacity cannot be less')) {
        return res.status(400).json({ message: error.message });
      }

      Logger.error('Error updating location', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async capacityCheck(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ message: 'Invalid location id' });
      }

      const info = await WarehouseService.capacityCheck(id);
      return res.status(200).json(info);
    } catch (error: any) {
      if (error instanceof Error && error.message.includes('Location not found')) {
        return res.status(404).json({ message: error.message });
      }

      Logger.error('Error checking location capacity', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

}
