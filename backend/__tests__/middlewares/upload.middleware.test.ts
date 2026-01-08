import { uploadPartImage } from '../../src/middlewares/upload.middleware.js';
import { prisma } from '../../src/lib/prisma.js';
import multer from 'multer';

// Mock dependencies
jest.mock('../../src/lib/prisma.js', () => ({
  prisma: {
    part: {
      findFirst: jest.fn(),
    },
  },
}));

// We need to access the fileFilter from the exported multer instance.
// But we cannot easily access it if it's not exported.
// However, typically multer instance exposes it in a certain way but it's internal.
// A better way is to see how `uploadPartImage` is defined.
// It is checking params.
// We can test `fileFilter` by extracting it if we could, but since we can't change code too much,
// we will access it via accessing the `fileFilter` property of the options passed to multer
// Or we can just import the module and if the fileFilter was exported we could test it directly.
// The user said "Don't correct the code itself only correct the test."
// So I cannot export fileFilter.
// I will try to retrieve it from the exported `uploadPartImage` object if possible,
// or use `uploadPartImage` as a middleware in a mock app, OR just manually call it if it exposes.
// `uploadPartImage` is a Multer instance. `multer()` returns a middleware function that has properties?
// No, `multer({...})` returns a Multer object which has `.single()`, `.array()`, etc.
// The `fileFilter` is internal to Multer instance.
//
// WAITING: I'll try to re-read the file content to see if I can simply import the fileFilter if I missed something.
// Re-reading: `export const uploadPartImage = multer({ storage, fileFilter });`
// It is NOT exporting `fileFilter`.
//
// Strategy: I will rely on the fact that I can't easily unit test `fileFilter` in isolation without exporting it.
// However, I can mock `multer` to capture the options passed to it! 
// This way verify the logic of `fileFilter` passed to the factory.
// But `multer` is imported. I can mock `multer`.

jest.mock('multer', () => {
    const multerMock = jest.fn((options) => {
        // We attach options to the returned object so we can inspect them in tests
        const middleware: any = () => {};
        middleware.options = options;
        return middleware;
    });
    // @ts-ignore
    multerMock.diskStorage = jest.fn(() => 'mockStorage');
    return multerMock;
});

describe('Upload Middleware', () => {
   let fileFilter: any;

   beforeAll(() => {
       // @ts-ignore
       fileFilter = (uploadPartImage as any).options.fileFilter;
   });
   
   beforeEach(() => {
       jest.clearAllMocks();
   });

   it('validates missing refParam', () => {
       const req: any = { params: {} };
       const cb = jest.fn();
       
       fileFilter(req, {}, cb);
       
       expect(req.fileValidationError).toBe('Part reference is required');
       expect(req.fileValidationStatus).toBe(400);
       expect(cb).toHaveBeenCalledWith(null, false);
   });

   it('validates part not found', async () => {
       const req: any = { params: { ref: '123' } };
       const cb = jest.fn();
       (prisma.part.findFirst as jest.Mock).mockResolvedValue(null);

       // fileFilter returns void but does async work. we need to wait.
       // It uses promise chain.
       await fileFilter(req, {}, cb);
       
       // Just to be safe, wait for microtasks
       await new Promise(process.nextTick);

       expect(prisma.part.findFirst).toHaveBeenCalledWith({ where: { refInternal: '123', deletedAt: null } });
       expect(req.fileValidationError).toBe('Part not found');
       expect(req.fileValidationStatus).toBe(404);
       expect(cb).toHaveBeenCalledWith(null, false);
   });

   it('passes validation if part exists', async () => {
       const req: any = { params: { ref: '123' } };
       const cb = jest.fn();
       (prisma.part.findFirst as jest.Mock).mockResolvedValue({ id: 1 });

       await fileFilter(req, {}, cb);
       await new Promise(process.nextTick);

       expect(cb).toHaveBeenCalledWith(null, true);
       expect(req.fileValidationError).toBeUndefined();
   });

   it('handles db errors', async () => {
        const req: any = { params: { ref: '123' } };
        const cb = jest.fn();
        const error = new Error('DB Error');
        (prisma.part.findFirst as jest.Mock).mockRejectedValue(error);

        await fileFilter(req, {}, cb);
        await new Promise(process.nextTick);

        expect(req.fileValidationError).toBe('Unable to validate part');
        expect(req.fileValidationStatus).toBe(500);
        expect(cb).toHaveBeenCalledWith(error);
   });
});
