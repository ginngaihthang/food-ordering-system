import { sequelize } from '../config/database.js'
import { User } from './User.js'
import { Category } from './Category.js'
import { Product } from './Product.js';
import { RestaurantTable } from './Table.js';
import { TableSession } from './TableSession.js';
import { Order } from './Order.js';
import { OrderItem } from './OrderItem.js';

// Category <-> Product
Category.hasMany(Product, { foreignKey: 'categoryId' });
Product.belongsTo(Category, { foreignKey: 'categoryId' });

// Table <-> TableSession
RestaurantTable.hasMany(TableSession, { foreignKey: 'tableId' });
TableSession.belongsTo(RestaurantTable, { foreignKey: 'tableId' });

// TableSession <-> Order
TableSession.hasMany(Order, { foreignKey: 'tableSessionId' });
Order.belongsTo(TableSession, { foreignKey: 'tableSessionId' });

// Order <-> OrderItem
Order.hasMany(OrderItem, { foreignKey: 'orderId' });
OrderItem.belongsTo(Order, { foreignKey: 'orderId' });

// Product <-> OrderItem
Product.hasMany(OrderItem, { foreignKey: 'productId' });
OrderItem.belongsTo(Product, { foreignKey: 'productId' });

export {
  sequelize,
  User,
  Category,
  Product,
  RestaurantTable,
  TableSession,
  Order,
  OrderItem,
};