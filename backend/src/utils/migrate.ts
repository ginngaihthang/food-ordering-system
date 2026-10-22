import dotenv from 'dotenv';
dotenv.config();

import { sequelize } from '../models/index.js';
import { runMigrations } from '../migrations/index.js';

runMigrations() 
  .then(() => {
    console.log('Migrations are up to date');
    return sequelize.close();
  })
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });