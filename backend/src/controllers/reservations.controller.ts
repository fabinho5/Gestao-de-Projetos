import { Request, Response } from 'express';
import { ReservationsService } from '../services/reservations.service.js';
import { Logger } from '../utils/logger.js';
import { ReservationStatus, CancelReason } from '@prisma/client';

export class ReservationsController {

    /**
     * POST /reservations
     * Cria uma nova reserva (SALES apenas)
     */
    static async createReservation(req: Request, res: Response) {
        try {
            const user = req.user;
            if (!user) return res.status(401).json({ message: 'Not authenticated' });

            const { partId, notes } = req.body;

            if (!partId || typeof partId !== 'number') {
                return res.status(400).json({ message: 'partId is required and must be a number' });
            }

            const reservation = await ReservationsService.createReservation(user.id, partId, notes);
            
            Logger.info(`User ${user.username} created reservation ${reservation.id} for part ${partId} (reqId=${req.headers['x-request-id'] || 'n/a'})`);
            return res.status(201).json(reservation);

        } catch (error: any) {
            Logger.error(`Create reservation failed (userId=${req.user?.id}, reqId=${req.headers['x-request-id'] || 'n/a'})`, error);

            if (error.message === 'Part not found') {
                return res.status(404).json({ message: 'Part not found' });
            }

            if (error.message === 'Part already has an active reservation') {
                return res.status(409).json({ message: 'Part already has an active reservation' });
            }

            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    /**
     * GET /reservations
     * Lista reservas (com filtros opcionais)
     */
    static async getReservations(req: Request, res: Response) {
        try {
            const user = req.user;
            if (!user) return res.status(401).json({ message: 'Not authenticated' });

            const { status, userId, assignedToId } = req.query;

            const filters: any = {};
            
            if (status && Object.values(ReservationStatus).includes(status as ReservationStatus)) {
                filters.status = status;
            }
            
            if (userId) {
                filters.userId = parseInt(userId as string);
            }
            
            if (assignedToId) {
                filters.assignedToId = parseInt(assignedToId as string);
            }

            const reservations = await ReservationsService.getReservations(filters);
            
            Logger.info(`User ${user.username} listed reservations (count=${reservations.length}, reqId=${req.headers['x-request-id'] || 'n/a'})`);
            return res.status(200).json(reservations);

        } catch (error: any) {
            Logger.error(`List reservations failed (userId=${req.user?.id}, reqId=${req.headers['x-request-id'] || 'n/a'})`, error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    /**
     * GET /reservations/pending
     * Lista reservas pendentes (para WAREHOUSE)
     */
    static async getPendingReservations(req: Request, res: Response) {
        try {
            const user = req.user;
            if (!user) return res.status(401).json({ message: 'Not authenticated' });

            const reservations = await ReservationsService.getPendingReservations();
            
            Logger.info(`User ${user.username} listed pending reservations (count=${reservations.length}, reqId=${req.headers['x-request-id'] || 'n/a'})`);
            return res.status(200).json(reservations);

        } catch (error: any) {
            Logger.error(`List pending reservations failed (userId=${req.user?.id}, reqId=${req.headers['x-request-id'] || 'n/a'})`, error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    /**
     * GET /reservations/my-assigned
     * Lista reservas que assumi (WAREHOUSE)
     */
    static async getMyAssignedReservations(req: Request, res: Response) {
        try {
            const user = req.user;
            if (!user) return res.status(401).json({ message: 'Not authenticated' });

            const reservations = await ReservationsService.getMyAssignedReservations(user.id);
            
            Logger.info(`User ${user.username} listed assigned reservations (count=${reservations.length}, reqId=${req.headers['x-request-id'] || 'n/a'})`);
            return res.status(200).json(reservations);

        } catch (error: any) {
            Logger.error(`List assigned reservations failed (userId=${req.user?.id}, reqId=${req.headers['x-request-id'] || 'n/a'})`, error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    /**
     * GET /reservations/:id
     * Obtém detalhes de uma reserva
     */
    static async getReservationById(req: Request, res: Response) {
        try {
            const user = req.user;
            if (!user) return res.status(401).json({ message: 'Not authenticated' });

            const reservationId = parseInt(req.params.id);
            
            if (isNaN(reservationId)) {
                return res.status(400).json({ message: 'Invalid reservation ID' });
            }

            const reservation = await ReservationsService.getReservationById(reservationId);
            return res.status(200).json(reservation);

        } catch (error: any) {
            Logger.error(`Get reservation failed (userId=${req.user?.id}, reqId=${req.headers['x-request-id'] || 'n/a'})`, error);

            if (error.message === 'Reservation not found') {
                return res.status(404).json({ message: 'Reservation not found' });
            }

            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    /**
     * POST /reservations/:id/assign
     * WAREHOUSE assume a preparação
     */
    static async assignReservation(req: Request, res: Response) {
        try {
            const user = req.user;
            if (!user) return res.status(401).json({ message: 'Not authenticated' });

            const reservationId = parseInt(req.params.id);
            
            if (isNaN(reservationId)) {
                return res.status(400).json({ message: 'Invalid reservation ID' });
            }

            const reservation = await ReservationsService.assignReservation(reservationId, user.id);
            
            Logger.info(`User ${user.username} assigned reservation ${reservationId} (reqId=${req.headers['x-request-id'] || 'n/a'})`);
            return res.status(200).json(reservation);

        } catch (error: any) {
            Logger.error(`Assign reservation failed (userId=${req.user?.id}, reqId=${req.headers['x-request-id'] || 'n/a'})`, error);

            if (error.message === 'Reservation not found') {
                return res.status(404).json({ message: 'Reservation not found' });
            }

            if (error.message === 'Only PENDING reservations can be assigned') {
                return res.status(400).json({ message: error.message });
            }

            if (error.message === 'Reservation already assigned') {
                return res.status(409).json({ message: 'Reservation already assigned to another user' });
            }

            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    /**
     * PATCH /reservations/:id/status
     * Atualiza o status de uma reserva
     */
    static async updateStatus(req: Request, res: Response) {
        try {
            const user = req.user;
            if (!user) return res.status(401).json({ message: 'Not authenticated' });

            const reservationId = parseInt(req.params.id);
            const { status } = req.body;
            
            if (isNaN(reservationId)) {
                return res.status(400).json({ message: 'Invalid reservation ID' });
            }

            if (!status || !Object.values(ReservationStatus).includes(status)) {
                return res.status(400).json({ 
                    message: `Invalid status. Must be one of: ${Object.values(ReservationStatus).join(', ')}` 
                });
            }

            const reservation = await ReservationsService.updateStatus(reservationId, status, user.id);
            
            Logger.info(`User ${user.username} updated reservation ${reservationId} to ${status} (reqId=${req.headers['x-request-id'] || 'n/a'})`);
            return res.status(200).json(reservation);

        } catch (error: any) {
            Logger.error(`Update reservation status failed (userId=${req.user?.id}, reqId=${req.headers['x-request-id'] || 'n/a'})`, error);

            if (error.message === 'Reservation not found') {
                return res.status(404).json({ message: 'Reservation not found' });
            }

            if (error.message.startsWith('Cannot transition')) {
                return res.status(400).json({ message: error.message });
            }

            if (error.message === 'Only the assigned user can update this reservation') {
                return res.status(403).json({ message: error.message });
            }

            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    /**
     * POST /reservations/:id/cancel
     * Cancela uma reserva com motivo
     * Body: { cancelReason: 'DESIST' | 'RETURN' | 'DAMAGED_RETURN', returnLocationId?: number }
     */
    static async cancelReservation(req: Request, res: Response) {
        try {
            const user = req.user;
            if (!user) return res.status(401).json({ message: 'Not authenticated' });

            const reservationId = parseInt(req.params.id);
            const { cancelReason, returnLocationId } = req.body;
            
            if (isNaN(reservationId)) {
                return res.status(400).json({ message: 'Invalid reservation ID' });
            }

            if (!cancelReason || !Object.values(CancelReason).includes(cancelReason)) {
                return res.status(400).json({ 
                    message: `cancelReason is required. Must be one of: ${Object.values(CancelReason).join(', ')}` 
                });
            }

            if (returnLocationId !== undefined && typeof returnLocationId !== 'number') {
                return res.status(400).json({ message: 'returnLocationId must be a number' });
            }

            const reservation = await ReservationsService.cancelReservation(
                reservationId, 
                user.id,
                cancelReason,
                returnLocationId
            );
            
            Logger.info(`User ${user.username} cancelled reservation ${reservationId} (reason=${cancelReason}, returnLoc=${returnLocationId || 'none'}) (reqId=${req.headers['x-request-id'] || 'n/a'})`);
            return res.status(200).json(reservation);

        } catch (error: any) {
            Logger.error(`Cancel reservation failed (userId=${req.user?.id}, reqId=${req.headers['x-request-id'] || 'n/a'})`, error);

            if (error.message === 'Reservation not found') {
                return res.status(404).json({ message: 'Reservation not found' });
            }

            if (error.message.includes('Cannot') || 
                error.message.includes('already') ||
                error.message.includes('required') ||
                error.message.includes('reason')) {
                return res.status(400).json({ message: error.message });
            }

            return res.status(500).json({ message: 'Internal server error' });
        }
    }
}
