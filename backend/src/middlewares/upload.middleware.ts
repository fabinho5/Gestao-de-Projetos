import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { prisma } from '../lib/prisma.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const ref = req.params?.ref || 'general';
    const dest = path.join(__dirname, '..', 'uploads', 'parts', ref);
    ensureDir(dest);
    cb(null, dest);
  },
  filename: (_req, file, cb) => {
    const timestamp = Date.now();
    const safeOriginal = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, '_');
    cb(null, `${timestamp}-${safeOriginal}`);
  },
});

const fileFilter: multer.Options['fileFilter'] = (req, _file, cb) => {
  const ref = req.params?.ref;
  if (!ref) {
    (req as any).fileValidationError = 'Part reference is required';
    (req as any).fileValidationStatus = 400;
    return cb(null, false);
  }

  prisma.part
    .findFirst({ where: { refInternal: ref, deletedAt: null } })
    .then((part) => {
      if (!part) {
        (req as any).fileValidationError = 'Part not found';
        (req as any).fileValidationStatus = 404;
        return cb(null, false);
      }
      cb(null, true);
    })
    .catch((err) => {
      (req as any).fileValidationError = 'Unable to validate part';
      (req as any).fileValidationStatus = 500;
      cb(err);
    });
};

export const uploadPartImage = multer({ storage, fileFilter });
