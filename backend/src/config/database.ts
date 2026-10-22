import { Sequelize } from "sequelize";
import dotenv from 'dotenv';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl)  {
    throw new Error ('DATABASE_URL is not defined in .env')
}

export const sequelize = new Sequelize(databaseUrl, {
    dialect: 'postgres',
    dialectOptions: process.env.NODE_ENV === "production"
    ? { ssl: { require: true, rejectUnauthorized: false } } : {},
    logging: false,
})