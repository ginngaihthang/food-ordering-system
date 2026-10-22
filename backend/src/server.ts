import http from 'http';
import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import { sequelize } from './models/index.js';
import { runMigrations } from './migrations/index.js';
import { initSocket } from './sockets/index.js';
import { startIdleSessionJob } from './jobs/closeIdleSessions.js';
import { startCheckoutJob } from './services/checkoutService.js';

const PORT = process.env.PORT || 5000;
const httpServer = http.createServer(app);
initSocket(httpServer);

async function start() {
    try {
        await sequelize.authenticate();
        console.log('Database connected');
        // await sequelize.sync({ alter: true });
        await runMigrations();
        console.log('Database is up to date')

        httpServer.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`)
            startIdleSessionJob();
            startCheckoutJob();
        })

    } catch (err) {
        console.error('Failed to start Server: ', err);
        process.exit(1)
    }
}

start();