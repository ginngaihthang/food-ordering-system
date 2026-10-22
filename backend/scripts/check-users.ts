import { sequelize } from '../src/config/database';

const [rows] = await sequelize.query('SELECT id, email FROM "Users"');
console.table(rows);

await sequelize.close();