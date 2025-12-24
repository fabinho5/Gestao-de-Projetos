import express from 'express';
import cors from 'cors';

// ALL IMPORT FOR ROUTES HERE
import { partsRouter } from './routes/parts.routes.js';
import { authRouter } from './routes/auth.routes.js';
import { favoritesRouter } from './routes/favorites.routes.js';
import { reservationsRouter } from './routes/reservations.routes.js';
import { stockMovementRouter } from './routes/stockMovement.routes.js';

const app = express();

app.use(cors());
app.use(express.json());

// ALL ROUTES SHOULD BE REGISTERED HERE
app.use('/parts', partsRouter);
app.use('/auth', authRouter);
app.use('/favorites', favoritesRouter);
app.use('/reservations', reservationsRouter);
app.use('/stock-movements', stockMovementRouter);

export { app };