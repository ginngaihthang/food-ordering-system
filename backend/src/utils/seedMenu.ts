import dotenv from 'dotenv';
dotenv.config();

import { sequelize, Category, Product } from '../models/index.js';

async function seed() {
  await sequelize.authenticate();

  const mainCourse = await Category.create({ name: 'Main Course' });
  const drinks = await Category.create({ name: 'Drinks' });
  const desserts = await Category.create({ name: 'Desserts' });

  await Product.create({
    categoryId: mainCourse.id,
    name: 'Chicken Rice',
    description: 'Steamed chicken with fragrant rice',
    price: 6.5,
    isAvailable: true,
  });

  await Product.create({
    categoryId: mainCourse.id,
    name: 'Fried Rice',
    description: 'Wok-fried rice with egg and vegetables',
    price: 5.0,
    isAvailable: true,
  });

  await Product.create({
    categoryId: drinks.id,
    name: 'Coke',
    description: 'Ice cold Coca-Cola',
    price: 2.0,
    isAvailable: true,
  });

  await Product.create({
    categoryId: desserts.id,
    name: 'Ice Cream',
    description: 'Vanilla ice cream scoop',
    price: 3.0,
    isAvailable: true,
  });

  console.log('Menu seeded successfully');
  process.exit(0);
}

seed();