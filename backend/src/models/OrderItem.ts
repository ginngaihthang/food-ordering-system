import { DataTypes, Model, type Optional } from 'sequelize';
import { sequelize } from '../config/database.js';

interface OrderItemAttributes {
  id: number;
  orderId: number;
  productId: number;
  quantity: number;
  notes: string | null;
  unitPrice: number;  // added — required by SRS BR-10 (historical price)
  subtotal: number;   // added — required by SRS BR-10
}

type OrderItemCreationAttributes = Optional <OrderItemAttributes, 'id' | 'notes'>;

export class OrderItem
  extends Model<OrderItemAttributes, OrderItemCreationAttributes>
  implements OrderItemAttributes
{
  declare id: number;
  declare orderId: number;
  declare productId: number;
  declare quantity: number;
  declare notes: string | null;
  declare unitPrice: number;
  declare subtotal: number;
}

OrderItem.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    orderId: { type: DataTypes.INTEGER, allowNull: false },
    productId: { type: DataTypes.INTEGER, allowNull: false },
    quantity: { type: DataTypes.INTEGER, allowNull: false },
    notes: { type: DataTypes.STRING, allowNull: true },
    unitPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    subtotal: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  },
  {
    sequelize,
    tableName: 'order_items',
    timestamps: false, // DBML only has created_at, no updated_at
    createdAt: 'created_at',
    updatedAt: false,
    underscored: true,
  }
);