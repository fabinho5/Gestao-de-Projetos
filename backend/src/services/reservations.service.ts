import { prisma } from '../lib/prisma.js';
import { ReservationStatus, CancelReason } from '@prisma/client';
import { stockMovementService } from './stockMovement.service.js';
import { auditLogService } from './auditLog.service.js';

export class ReservationsService {

    /**
     * Cria uma nova reserva (apenas SALES)
     * Status inicial: PENDING
     */
    static async createReservation(userId: number, partId: number, notes?: string) {
        // Verificar se a peça existe (isVisible só se aplica a CLIENT, não a SALES/WAREHOUSE/ADMIN)
        const part = await prisma.part.findUnique({ 
            where: { id: partId },
            select: { id: true, name: true, deletedAt: true }
        });

        if (!part || part.deletedAt) {
            throw new Error("Part not found");
        }

        // Verificar se já existe uma reserva ativa para esta peça
        const existingReservation = await prisma.reservation.findFirst({
            where: {
                partId,
                status: {
                    in: [
                        ReservationStatus.PENDING,
                        ReservationStatus.CONFIRMED,
                        ReservationStatus.IN_PREPARATION,
                        ReservationStatus.READY_TO_SHIP
                    ]
                }
            }
        });

        if (existingReservation) {
            throw new Error("Part already has an active reservation");
        }

        // Criar a reserva
        const reservation = await prisma.reservation.create({
            data: {
                userId,
                partId,
                notes,
                status: ReservationStatus.PENDING
            },
            include: {
                user: { select: { id: true, username: true, fullName: true } },
                part: { select: { id: true, name: true, refInternal: true } }
            }
        });

        // Log every reservation creation with the originating user and status.
        await auditLogService.record({
            userId,
            action: 'RESERVATION_CREATE',
            entity: 'RESERVATION',
            entityId: reservation.id,
            details: {
                partId,
                status: reservation.status,
                notes: notes ?? null,
            },
        });

        return reservation;
    }

    /**
     * Lista reservas com filtros opcionais
     * - SALES vê as suas reservas
     * - WAREHOUSE vê reservas pendentes/em preparação
     * - ADMIN vê todas
     */
    static async getReservations(filters?: { 
        status?: ReservationStatus; 
        userId?: number;
        assignedToId?: number;
    }) {
        const reservations = await prisma.reservation.findMany({
            where: {
                ...(filters?.status && { status: filters.status }),
                ...(filters?.userId && { userId: filters.userId }),
                ...(filters?.assignedToId && { assignedToId: filters.assignedToId })
            },
            include: {
                user: { select: { id: true, username: true, fullName: true } },
                assignedTo: { select: { id: true, username: true, fullName: true } },
                part: { 
                    select: { 
                        id: true, 
                        name: true, 
                        refInternal: true,
                        location: { select: { id: true, fullCode: true } }
                    } 
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return reservations;
    }

    /**
     * Obtém uma reserva por ID
     */
    static async getReservationById(reservationId: number) {
        const reservation = await prisma.reservation.findUnique({
            where: { id: reservationId },
            include: {
                user: { select: { id: true, username: true, fullName: true } },
                assignedTo: { select: { id: true, username: true, fullName: true } },
                part: { 
                    include: { 
                        location: true,
                        category: true,
                        images: true
                    } 
                }
            }
        });

        if (!reservation) {
            throw new Error("Reservation not found");
        }

        return reservation;
    }

    /**
     * WAREHOUSE assume a preparação de uma reserva
     * Muda status: PENDING → IN_PREPARATION
     */
    static async assignReservation(reservationId: number, warehouseUserId: number) {
        const reservation = await prisma.reservation.findUnique({
            where: { id: reservationId }
        });

        if (!reservation) {
            throw new Error("Reservation not found");
        }

        if (reservation.status !== ReservationStatus.PENDING) {
            throw new Error("Only PENDING reservations can be assigned");
        }

        if (reservation.assignedToId) {
            throw new Error("Reservation already assigned");
        }

        const updated = await prisma.reservation.update({
            where: { id: reservationId },
            data: {
                assignedToId: warehouseUserId,
                status: ReservationStatus.IN_PREPARATION
            },
            include: {
                user: { select: { id: true, username: true, fullName: true } },
                assignedTo: { select: { id: true, username: true, fullName: true } },
                part: { select: { id: true, name: true, refInternal: true } }
            }
        });

        // Record which warehouse user picked up the work and when the status moved.
        await auditLogService.record({
            userId: warehouseUserId,
            action: 'RESERVATION_ASSIGN',
            entity: 'RESERVATION',
            entityId: reservationId,
            details: {
                previousStatus: reservation.status,
                newStatus: updated.status,
                assignedToId: warehouseUserId,
            },
        });

        return updated;
    }

    /**
     * Atualiza o status de uma reserva
     * Valida transições permitidas
     */
    static async updateStatus(reservationId: number, newStatus: ReservationStatus, userId: number) {
        const reservation = await prisma.reservation.findUnique({
            where: { id: reservationId }
        });

        if (!reservation) {
            throw new Error("Reservation not found");
        }

        // Validar transições de status permitidas
        const allowedTransitions: Record<ReservationStatus, ReservationStatus[]> = {
            PENDING: [ReservationStatus.IN_PREPARATION, ReservationStatus.CANCELLED],
            IN_PREPARATION: [ReservationStatus.READY_TO_SHIP, ReservationStatus.CANCELLED],
            READY_TO_SHIP: [ReservationStatus.COMPLETED, ReservationStatus.CANCELLED],
            COMPLETED: [ReservationStatus.CONFIRMED, ReservationStatus.CANCELLED], // Pode cancelar (devolução)
            CONFIRMED: [], // Estado final - cliente confirmou receção
            CANCELLED: []
        };

        if (!allowedTransitions[reservation.status].includes(newStatus)) {
            throw new Error(`Cannot transition from ${reservation.status} to ${newStatus}`);
        }

        // Se está em preparação, só quem assumiu pode atualizar
        if (reservation.assignedToId && reservation.assignedToId !== userId) {
            // Permitir que ADMIN ou o criador da reserva cancelem
            if (newStatus !== ReservationStatus.CANCELLED) {
                throw new Error("Only the assigned user can update this reservation");
            }
        }

        const updated = await prisma.reservation.update({
            where: { id: reservationId },
            data: { status: newStatus },
            include: {
                user: { select: { id: true, username: true, fullName: true } },
                assignedTo: { select: { id: true, username: true, fullName: true } },
                part: { select: { id: true, name: true, refInternal: true } }
            }
        });

        // Se mudou para COMPLETED, registar EXIT (peça sai do armazém)
        if (newStatus === ReservationStatus.COMPLETED) {
            await stockMovementService.recordExit(reservation.partId, userId);
        }

        // Persist status transitions to keep a clear timeline of reservation progress.
        await auditLogService.record({
            userId,
            action: 'RESERVATION_STATUS',
            entity: 'RESERVATION',
            entityId: reservationId,
            details: {
                previousStatus: reservation.status,
                newStatus,
                partId: reservation.partId,
            },
        });

        return updated;
    }

    /**
     * Cancela uma reserva com motivo e tratamento de devolução
     * - DESIST: antes de COMPLETED, peça já está no armazém
     * - RETURN: após COMPLETED, peça volta para localização escolhida
     * - DAMAGED_RETURN: após COMPLETED, peça danificada (isVisible=false)
     */
    static async cancelReservation(
        reservationId: number, 
        userId: number,
        cancelReason: CancelReason,
        returnLocationId?: number
    ) {
        const reservation = await prisma.reservation.findUnique({
            where: { id: reservationId },
            include: { part: true }
        });

        if (!reservation) {
            throw new Error("Reservation not found");
        }

        // Não pode cancelar se já CONFIRMED ou já CANCELLED
        if (reservation.status === ReservationStatus.CONFIRMED) {
            throw new Error("Cannot cancel a confirmed reservation");
        }
        if (reservation.status === ReservationStatus.CANCELLED) {
            throw new Error("Reservation already cancelled");
        }

        // Validar lógica de cancelamento baseada no status atual
        const wasCompleted = reservation.status === ReservationStatus.COMPLETED;

        if (wasCompleted) {
            // Após COMPLETED: só RETURN ou DAMAGED_RETURN fazem sentido
            if (cancelReason === CancelReason.DESIST) {
                throw new Error("Cannot use DESIST reason after part was delivered");
            }

            // Para RETURN normal, precisa de localização
            if (cancelReason === CancelReason.RETURN && !returnLocationId) {
                throw new Error("returnLocationId is required for RETURN");
            }

            // Registar movimento de RETURN
            await stockMovementService.recordReturn({
                partId: reservation.partId,
                userId,
                toLocationId: returnLocationId,
                isDamaged: cancelReason === CancelReason.DAMAGED_RETURN
            });
        } else {
            // Antes de COMPLETED: só DESIST faz sentido
            if (cancelReason !== CancelReason.DESIST) {
                throw new Error("Use DESIST reason before part is delivered");
            }
            // Peça ainda está no armazém, não precisa de movimento
        }

        // Atualizar reserva
        const updated = await prisma.reservation.update({
            where: { id: reservationId },
            data: {
                status: ReservationStatus.CANCELLED,
                cancelReason,
                cancelledAt: new Date(),
                returnLocationId: cancelReason === CancelReason.RETURN ? returnLocationId : null
            },
            include: {
                user: { select: { id: true, username: true, fullName: true } },
                assignedTo: { select: { id: true, username: true, fullName: true } },
                part: { select: { id: true, name: true, refInternal: true } },
                returnLocation: true
            }
        });

        // Capture cancellations, reasons, and return logistics for auditing.
        await auditLogService.record({
            userId,
            action: 'RESERVATION_CANCEL',
            entity: 'RESERVATION',
            entityId: reservationId,
            details: {
                cancelReason,
                wasCompleted,
                partId: reservation.partId,
                returnLocationId: returnLocationId ?? null,
            },
        });

        return updated;
    }

    /**
     * Lista reservas pendentes para WAREHOUSE
     * (reservas que ainda não foram assumidas)
     */
    static async getPendingReservations() {
        return this.getReservations({ status: ReservationStatus.PENDING });
    }

    /**
     * Lista reservas assumidas por um utilizador do WAREHOUSE
     */
    static async getMyAssignedReservations(warehouseUserId: number) {
        return prisma.reservation.findMany({
            where: {
                assignedToId: warehouseUserId,
                status: {
                    in: [ReservationStatus.IN_PREPARATION, ReservationStatus.READY_TO_SHIP]
                }
            },
            include: {
                user: { select: { id: true, username: true, fullName: true } },
                part: { 
                    select: { 
                        id: true, 
                        name: true, 
                        refInternal: true,
                        location: { select: { id: true, fullCode: true } }
                    } 
                }
            },
            orderBy: { updatedAt: 'desc' }
        });
    }
}
