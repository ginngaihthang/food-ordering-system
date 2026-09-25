import http from 'http';
import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import { sequelize } from './models/index.js';
import { initSocket } from './sockets/index.js';

const PORT = process.env.PORT || 5001;
const httpServer = http.createServer(app);
initSocket(httpServer);

async function start() {
    try {
        await sequelize.authenticate();
        console.log('Database connected');
        await sequelize.sync();

        httpServer.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`)
        })

    } catch (err) {
        console.error('Failed to start Server: ', err);
        process.exit(1)
    }
}

start();