import { sequelize } from '../src/config/database';

const [rows] = await sequelize.query(`
  SELECT table_name
  FROM information_schema.tables
  WHERE table_schema = 'public'
  ORDER BY table_name
`);
console.table(rows);

await sequelize.close();