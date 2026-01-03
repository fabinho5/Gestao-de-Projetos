import { Request, Response } from 'express';
import { z } from 'zod';
import { auditLogService } from '../services/auditLog.service.js';
import { Logger } from '../utils/logger.js';

// Allow optional ISO date strings (blank values are ignored) for range filtering.
const optionalDate = z
  .preprocess((val) => {
    if (val === undefined || val === null || val === '') return undefined;
    return val;
  }, z.coerce.date())
  .optional();

const listSchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(200).optional(),
  userId: z.coerce.number().int().positive().optional(),
  action: z.string().trim().min(1).optional(),
  entity: z.string().trim().min(1).optional(),
  entityId: z.string().trim().min(1).optional(),
  search: z.string().trim().min(1).optional(),
  dateFrom: optionalDate,
  dateTo: optionalDate,
});

// HTTP handlers that expose the audit log querying capabilities to admins.
export class AuditLogController {
  static async getLogs(req: Request, res: Response) {
    try {
      // Parse and validate query filters before hitting the service layer.
      const filters = listSchema.parse(req.query);
      const result = await auditLogService.getLogs(filters);
      return res.status(200).json(result);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation failed', errors: error.errors });
      }

      Logger.error('Error fetching audit logs', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async getLogById(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ message: 'Invalid log id' });
      }

      // Fetch a single log entry to inspect its payload and associated user.
      const log = await auditLogService.getLogById(id);
      if (!log) {
        return res.status(404).json({ message: 'Audit log not found' });
      }

      return res.status(200).json(log);
    } catch (error) {
      Logger.error('Error fetching audit log by id', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }
}
