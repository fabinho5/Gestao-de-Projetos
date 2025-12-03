import express from 'express';
import cors from 'cors';

// ALL IMPORT FOR ROUTES HERE
import { partsRouter } from './routes/parts.routes.js';
import { authRouter } from './routes/auth.routes.js';

const app = express();

app.use(cors());
app.use(express.json());

// ALL ROUTES SHOULD BE REGISTERED HERE
app.use('/parts', partsRouter);
app.use('/auth', authRouter);

export { app };