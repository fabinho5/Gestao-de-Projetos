import { requireRole } from '../../src/middlewares/roles.middleware.js';
import { UserRole } from '@prisma/client';

describe('Roles Middleware', () => {
    let req: any;
    let res: any;
    let next: jest.Mock;

    beforeEach(() => {
        req = { user: undefined };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        next = jest.fn();
    });

    it('returns 401 if user is not authenticated', () => {
        const middleware = requireRole('ADMIN');
        middleware(req, res, next);
        
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: "Not authenticated" });
        expect(next).not.toHaveBeenCalled();
    });

    it('returns 403 if user has insufficient permissions', () => {
        req.user = { role: 'CLIENT' };
        const middleware = requireRole('ADMIN');
        middleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ message: "Forbidden: insufficient permissions" });
        expect(next).not.toHaveBeenCalled();
    });

    it('calls next if user has correct role', () => {
        req.user = { role: 'ADMIN' };
        const middleware = requireRole('ADMIN');
        middleware(req, res, next);

        expect(next).toHaveBeenCalled();
    });

    it('calls next if user has one of the allowed roles', () => {
        req.user = { role: 'SALES' };
        const middleware = requireRole('ADMIN', 'SALES');
        middleware(req, res, next);

        expect(next).toHaveBeenCalled();
    });
});
