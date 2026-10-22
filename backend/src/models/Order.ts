import { DataTypes, Model, type Optional } from 'sequelize';
import { sequelize } from '../config/database.js';

export type OrderTypeEnum = 'DINE_IN' | 'TAKEAWAY';
export type OrderStatusEnum =
  | 'PENDING'
  | 'PREPARING'
  | 'READY'
  | 'COMPLETED'
  | 'CANCELLED';

interface OrderAttributes {
  id: number;
  publicToken: string;
  tableSessionId: number | null;
  orderType: OrderTypeEnum;
  status: OrderStatusEnum;
  pickupNumber: number | null;
  taxRate: number;
  paymentStatus: 'UNPAID' | 'PAID';
  paymentMethod: 'CASH' | 'ONLINE' | null;
  paidAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

type OrderCreationAttributes = Optional <OrderAttributes,'id' | 'tableSessionId' | 'status' | 'pickupNumber' | 'taxRate' | 'paymentStatus' | 'paymentMethod' | 'paidAt'>;

export class Order
  extends Model<OrderAttributes, OrderCreationAttributes>
  implements OrderAttributes
{
  declare id: number;
  declare publicToken: string;
  declare tableSessionId: number | null;
  declare orderType: OrderTypeEnum;
  declare status: OrderStatusEnum;
  declare pickupNumber: number | null;
  declare taxRate: number;
  declare paymentStatus: 'UNPAID' | 'PAID';
  declare paymentMethod: 'CASH' | 'ONLINE' | null;
  declare paidAt: Date | null;
  declare createdAt: Date;
  declare updatedAt: Date;
}

Order.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    publicToken: { type: DataTypes.STRING(64), allowNull: false, unique: true },
    tableSessionId: { type: DataTypes.INTEGER, allowNull: true },
    orderType: {
      type: DataTypes.ENUM('DINE_IN', 'TAKEAWAY'),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(
        'PENDING',
        'PREPARING',
        'READY',
        'COMPLETED',
        'CANCELLED'
      ),
      defaultValue: 'PENDING',
    },
    pickupNumber: { type: DataTypes.INTEGER, allowNull: true },
     paymentStatus: {
      type: DataTypes.ENUM('UNPAID', 'PAID'),
      defaultValue: 'UNPAID',
    },
    taxRate: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
    paymentMethod: {
      type: DataTypes.ENUM('CASH', 'ONLINE'),
      allowNull: true,
    },
    paidAt: { type: DataTypes.DATE, allowNull: true }
  },
  { sequelize, tableName: 'orders', timestamps: true, underscored: true }
);