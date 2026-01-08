import { loginLimiter, refreshLimiter } from '../../src/middlewares/rateLimit.middleware.js';

// Since we can't easily unit test the express-rate-limit library functionality itself (and shouldn't),
// we just check if the limiters are configured and exported.

describe('Rate Limit Middleware', () => {
    it('exports loginLimiter', () => {
        expect(loginLimiter).toBeDefined();
        // Check if it's a function (middleware)
        expect(typeof loginLimiter).toBe('function');
    });

    it('exports refreshLimiter', () => {
        expect(refreshLimiter).toBeDefined();
        expect(typeof refreshLimiter).toBe('function');
    });
});
