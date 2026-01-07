import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// ALL IMPORT FOR ROUTES HERE
import { partsRouter } from './routes/parts.routes.js';
import { authRouter } from './routes/auth.routes.js';
import { favoritesRouter } from './routes/favorites.routes.js';
import { reservationsRouter } from './routes/reservations.routes.js';
import { stockMovementRouter } from './routes/stockMovement.routes.js';
import { warehouseRouter } from './routes/warehouse.routes.js';
import { auditLogRouter } from './routes/auditLog.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ALL ROUTES SHOULD BE REGISTERED HERE
app.use('/parts', partsRouter);
app.use('/auth', authRouter);
app.use('/favorites', favoritesRouter);
app.use('/reservations', reservationsRouter);
app.use('/stock-movements', stockMovementRouter);
app.use('/warehouses', warehouseRouter);
// Admin-only audit log endpoints for compliance reviews.
app.use('/audit-logs', auditLogRouter);

export { app };