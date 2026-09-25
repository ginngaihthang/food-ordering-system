import dotenv from 'dotenv';
dotenv.config();

import bcrypt from 'bcrypt';
import { sequelize, User } from '../models/index.js'

async function seed() {
    await sequelize.authenticate();

    const existing = await User.findOne({ where: {email: 'admin@gmail.com'}})
    if(existing) {
        console.log('Admin already exists');
        process.exit(0);
    }

    const hashedPassword = await bcrypt.hash('admin', 10);
    await User.create({
        username: 'admin',
        email: 'admin@gmail.com',
        password: hashedPassword,
        role: 'ADMIN',
    })

    console.log('Admin user created: admin@gmail.com/ admin')
    process.exit(0);
}

seed();