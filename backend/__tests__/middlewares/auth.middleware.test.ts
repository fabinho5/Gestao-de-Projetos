import { authenticate } from '../../src/middlewares/auth.middleware.js';
import { prisma } from '../../src/lib/prisma.js';
import { Logger } from '../../src/utils/logger.js';
import jwt from 'jsonwebtoken';
import { env } from '../../src/config/env.js';

// Mock dependencies
jest.mock('../../src/lib/prisma.js', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('../../src/utils/logger.js', () => ({
  Logger: {
    warn: jest.fn(),
  },
}));

jest.mock('jsonwebtoken');

describe('Auth Middleware', () => {
  let req: any;
  let res: any;
  let next: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      headers: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  it('returns 401 if no token provided', async () => {
    await authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'NO_TOKEN_PROVIDED' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 if token expired', async () => {
    req.headers.authorization = 'Bearer expired-token';
    (jwt.verify as jest.Mock).mockImplementation(() => {
      throw new jwt.TokenExpiredError('expired', new Date());
    });

    await authenticate(req, res, next);

    expect(Logger.warn).toHaveBeenCalledWith('Access token expired');
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'ACCESS_TOKEN_EXPIRED' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 if token invalid', async () => {
    req.headers.authorization = 'Bearer invalid-token';
    (jwt.verify as jest.Mock).mockImplementation(() => {
      throw new Error('invalid signature');
    });

    await authenticate(req, res, next);

    expect(Logger.warn).toHaveBeenCalledWith(expect.stringContaining('Token verification failed'));
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'INVALID_ACCESS_TOKEN' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 if user not found', async () => {
    req.headers.authorization = 'Bearer valid-token';
    (jwt.verify as jest.Mock).mockReturnValue({ id: 1 });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'USER_NOT_FOUND' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 if user inactive', async () => {
    req.headers.authorization = 'Bearer valid-token';
    (jwt.verify as jest.Mock).mockReturnValue({ id: 1 });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 1, isActive: false });

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: 'USER_INACTIVE' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 if token invalidated by password change', async () => {
    req.headers.authorization = 'Bearer valid-token';
    const now = Date.now();
    (jwt.verify as jest.Mock).mockReturnValue({ id: 1, iat: Math.floor((now - 2000) / 1000) });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ 
      id: 1, 
      isActive: true, 
      passwordUpdatedAt: new Date(now) 
    });

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'ACCESS_TOKEN_INVALIDATED_BY_PASSWORD_CHANGE' });
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next and sets req.user on success', async () => {
    req.headers.authorization = 'Bearer valid-token';
    const now = Date.now();
    (jwt.verify as jest.Mock).mockReturnValue({ id: 1, iat: Math.floor((now + 1000) / 1000) });
    const userMock = {
        id: 1,
        isActive: true,
        passwordUpdatedAt: new Date(now - 5000),
        username: 'testuser',
        role: 'CLIENT'
    };
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(userMock);

    await authenticate(req, res, next);

    expect(req.user).toEqual({
        id: userMock.id,
        username: userMock.username,
        role: userMock.role
    });
    expect(next).toHaveBeenCalled();
  });
});
