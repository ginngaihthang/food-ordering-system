import { sequelize } from '../src/config/database';

const [rows] = await sequelize.query('SELECT name FROM "SequelizeMeta" ORDER BY name');
console.table(rows);

await sequelize.close();
