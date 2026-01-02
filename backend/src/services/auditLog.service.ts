import { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

export type RecordAuditLogParams = {
  userId: number;
  action: string;
  entity: string;
  entityId: string | number;
  details?: Record<string, unknown> | null;
};

export type AuditLogFilters = {
  page?: number;
  pageSize?: number;
  userId?: number;
  action?: string;
  entity?: string;
  entityId?: string | number;
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
};

type AuditClient = PrismaClient | Prisma.TransactionClient;

class AuditLogService {
  async record(
    params: RecordAuditLogParams,
    client: AuditClient = prisma
  ) {
    const { userId, action, entity, entityId, details } = params;

    return client.auditLog.create({
      data: {
        userId,
        action: action.toUpperCase(),
        entity: entity.toUpperCase(),
        entityId: String(entityId),
        ...(details ? { details } : {}),
      },
    });
  }

  async getLogs(filters: AuditLogFilters = {}) {
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const rawPageSize = filters.pageSize && filters.pageSize > 0 ? filters.pageSize : 25;
    const pageSize = Math.min(rawPageSize, 200);

    const where: Prisma.AuditLogWhereInput = {};

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.action) {
      where.action = { contains: filters.action, mode: 'insensitive' };
    }

    if (filters.entity) {
      where.entity = { contains: filters.entity, mode: 'insensitive' };
    }

    if (filters.entityId) {
      where.entityId = {
        contains: String(filters.entityId),
        mode: 'insensitive',
      };
    }

    if (filters.search) {
      const search = filters.search;
      where.OR = [
        { action: { contains: search, mode: 'insensitive' } },
        { entity: { contains: search, mode: 'insensitive' } },
        { entityId: { contains: search, mode: 'insensitive' } },
      ];
    }

    const timestampFilter: Prisma.DateTimeFilter = {};

    if (filters.dateFrom) {
      timestampFilter.gte = filters.dateFrom;
    }

    if (filters.dateTo) {
      timestampFilter.lte = filters.dateTo;
    }

    if (Object.keys(timestampFilter).length) {
      where.timestamp = timestampFilter;
    }

    const [items, total] = await prisma.$transaction([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: { id: true, username: true, fullName: true, role: true },
          },
        },
        orderBy: { timestamp: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async getLogById(id: number) {
    return prisma.auditLog.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, username: true, fullName: true, role: true },
        },
      },
    });
  }
}

export const auditLogService = new AuditLogService();
