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
  tableSessionId: number | null;
  orderType: OrderTypeEnum;
  status: OrderStatusEnum;
  pickupNumber: number | null;
}

type OrderCreationAttributes = Optional <OrderAttributes,'id' | 'tableSessionId' | 'status' | 'pickupNumber'>;

export class Order
  extends Model<OrderAttributes, OrderCreationAttributes>
  implements OrderAttributes
{
  declare id: number;
  declare tableSessionId: number | null;
  declare orderType: OrderTypeEnum;
  declare status: OrderStatusEnum;
  declare pickupNumber: number | null;
}

Order.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
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
  },
  { sequelize, tableName: 'orders', timestamps: true, underscored: true }
);