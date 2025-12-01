import { app } from './app.js';       
import { env } from './config/env.js'; 
import { prisma } from './lib/prisma.js';
import { Logger } from './utils/logger.js';

async function startServer() {
    try {
        Logger.info(`Starting server on port ${env.port}...`);
        
        await prisma.$connect();
        Logger.debug('Database connected successfully');
        
        app.listen(env.port, () => {
            Logger.info(`server is running on http://localhost:${env.port}`);
            Logger.debug(`Environment: ${env.nodeEnv}`);
        });
        
    } catch (error) {
        Logger.error('Error starting server', error);
    }
}

startServer();